"""
Volt Studio Sync — Blender 4.x Addon  (v1.1.0)
===============================================
Exports selected objects (mesh + armature only, no lights/cameras) as GLB
and optionally .blend, then POSTs to the Volt Studio CMS at /api/volt-3d.

INSTALLATION
------------
Blender 4.x — single-file install:
  Edit > Preferences > Add-ons > Install from Disk
  Select this .py file → Enable "Volt Studio Sync"

Then set your API URL + API Key in the addon preferences
(Edit > Preferences > Add-ons > Volt Studio Sync > expand).

USAGE
-----
1. Select the objects you want to sync in the 3D viewport.
   (Tip: Ctrl+A to select all mesh objects, or hand-pick what you need.)
2. Open the Volt panel in the View3D sidebar (N key > Volt tab).
3. Enter an Asset Name.  Leave Asset ID blank to create a new asset.
4. Click "Export & Sync to Volt".

NOTES
-----
- Only MESH and ARMATURE objects are exported — lights, cameras, empties
  and other non-geometry types are automatically excluded even if selected.
- Animations are detected from the selected objects' NLA tracks.
- Each sync creates a new version.  Confirm the version in Volt Studio
  to make it active and clean up unconfirmed older versions.

Dependencies: Python stdlib only (no pip).
"""

bl_info = {
    "name": "Volt Studio Sync",
    "author": "Volt Studio",
    "version": (1, 1, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Volt",
    "description": "Export selected objects and sync to Volt Studio CMS",
    "category": "Import-Export",
}

import bpy
import json
import os
import shutil
import tempfile
import uuid
import urllib.request
import urllib.error
from bpy.props import StringProperty, BoolProperty, PointerProperty
from bpy.types import AddonPreferences, PropertyGroup, Operator, Panel


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Object types included in the export (everything else is silently excluded)
EXPORTABLE_TYPES = {'MESH', 'ARMATURE', 'CURVE', 'SURFACE', 'META', 'FONT', 'GPENCIL'}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def build_multipart(fields, files, boundary):
    """
    Build a multipart/form-data body as bytes.

    ASSUMPTIONS:
    1. field values are str-coercible
    2. file content is already bytes
    3. boundary contains no special characters

    FAILURE MODES:
    - Non-bytes file content → TypeError at body concatenation
    - Boundary collision with content → malformed body (mitigated by uuid hex)
    """
    body = b''
    for name, value in fields.items():
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode()
        body += f'{value}\r\n'.encode()
    for name, (filename, content, ctype) in files.items():
        body += f'--{boundary}\r\n'.encode()
        body += f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode()
        body += f'Content-Type: {ctype}\r\n\r\n'.encode()
        body += content + b'\r\n'
    body += f'--{boundary}--\r\n'.encode()
    return body


def get_exportable_selected(context):
    """
    Return the subset of currently selected objects that are exportable
    (mesh, armature, curve, etc.) — filters out lights, cameras, empties.
    """
    return [
        obj for obj in context.selected_objects
        if obj.type in EXPORTABLE_TYPES
    ]


def detect_animation_clips(objects):
    """
    Walk each object's NLA tracks and collect unique animation clips.

    Args:
        objects: iterable of bpy.types.Object to scan (selected exportable objs)

    Returns a list of dicts: {name, duration, isDefault}.
    The first unique action encountered is marked isDefault=True.

    ASSUMPTIONS:
    1. bpy.context.scene.render.fps reflects the scene's actual FPS
    2. NLA strips use the action's frame_range for duration calculation

    FAILURE MODES:
    - Object with no animation_data → safely skipped
    - Action with zero frame range → duration of 0.0 (still included)
    """
    clips = []
    seen = set()
    fps = bpy.context.scene.render.fps or 24  # fallback to 24 if fps is 0

    for obj in objects:
        if not obj.animation_data:
            continue
        for track in obj.animation_data.nla_tracks:
            for strip in track.strips:
                action = strip.action
                if action and action.name not in seen:
                    seen.add(action.name)
                    frame_start, frame_end = action.frame_range
                    duration = (frame_end - frame_start) / fps
                    clips.append({
                        'name': action.name,
                        'duration': round(max(duration, 0.0), 3),
                        'isDefault': len(clips) == 0,
                    })

    return clips


# ---------------------------------------------------------------------------
# Addon Preferences
# ---------------------------------------------------------------------------

class VoltAddonPreferences(AddonPreferences):
    """Stored in user preferences — persists across Blender sessions."""

    bl_idname = __name__

    api_url: StringProperty(
        name="API URL",
        description="Base URL of your Volt Studio instance",
        default="http://localhost:3000",
    )
    api_key: StringProperty(
        name="API Key",
        description="API key generated in Volt Studio: Admin > Settings > API Keys",
        subtype='PASSWORD',
    )

    def draw(self, context):
        layout = self.layout
        layout.label(text="Set these before using the Volt panel:", icon='INFO')
        layout.prop(self, "api_url")
        layout.prop(self, "api_key")


# ---------------------------------------------------------------------------
# Scene Properties
# ---------------------------------------------------------------------------

class VoltSceneProps(PropertyGroup):
    """Per-scene properties stored on bpy.types.Scene.volt_props."""

    asset_name: StringProperty(
        name="Asset Name",
        description="Name for this 3D asset in Volt Studio",
        default="My 3D Object",
    )
    asset_id: StringProperty(
        name="Asset ID (optional)",
        description="Leave blank to create a new asset. Paste an existing Asset ID to update it.",
    )
    include_blend: BoolProperty(
        name="Include .blend file",
        description="Upload the .blend source file alongside the GLB so you can re-download and re-edit it",
        default=True,
    )
    last_status: StringProperty(
        name="Status",
        default="Ready — select objects then click Sync",
    )


# ---------------------------------------------------------------------------
# Operator
# ---------------------------------------------------------------------------

class VOLT_OT_sync(Operator):
    """Export selected mesh/armature objects as GLB and upload to Volt Studio."""

    bl_idname = "volt.sync"
    bl_label = "Export & Sync to Volt"
    bl_description = (
        "Export selected objects (mesh/armature) as GLB and upload to Volt Studio. "
        "Lights and cameras are automatically excluded."
    )

    def execute(self, context):
        """
        ASSUMPTIONS:
        1. Blender's built-in glTF exporter is enabled (it is by default in Blender 4.x)
        2. At least one exportable (mesh/armature) object is selected
        3. The API endpoint accepts multipart/form-data: name, assetId, animClips, glb, blend
        4. The API responds with JSON containing 'assetId' or 'id' on success
        5. A writable temp directory is available on the OS

        FAILURE MODES:
        - No exportable objects selected → early exit with clear message
        - glTF exporter not enabled → OperatorNotFound → caught, sets error status
        - Network unreachable → urllib.error.URLError → caught, sets error status
        - API returns non-200 → HTTPError → caught, sets error status
        - JSON parse failure → ValueError → caught, sets error status
        """
        props = context.scene.volt_props
        prefs = context.preferences.addons[__name__].preferences

        # --- Validate preferences ---
        if not prefs.api_url:
            props.last_status = "Error: API URL is not set — check addon preferences"
            self.report({'ERROR'}, props.last_status)
            return {'CANCELLED'}

        if not prefs.api_key.startswith('vlt_'):
            props.last_status = "Error: API Key must start with 'vlt_' — check addon preferences"
            self.report({'ERROR'}, props.last_status)
            return {'CANCELLED'}

        # --- Validate selection ---
        exportable = get_exportable_selected(context)
        if not exportable:
            selected_count = len(context.selected_objects)
            if selected_count == 0:
                props.last_status = "Error: Nothing selected — select objects in the viewport first"
            else:
                types_found = {o.type for o in context.selected_objects}
                props.last_status = (
                    f"Error: Selected objects ({', '.join(types_found)}) are not exportable. "
                    "Select meshes or armatures."
                )
            self.report({'WARNING'}, props.last_status)
            return {'CANCELLED'}

        tmp_dir = None
        try:
            # --- Temp directory ---
            tmp_dir = tempfile.mkdtemp(prefix='volt_sync_')

            # --- Export GLB (selected objects only) ---
            props.last_status = f"Exporting {len(exportable)} object(s) as GLB…"
            glb_path = os.path.join(tmp_dir, 'export.glb')
            bpy.ops.export_scene.gltf(
                filepath=glb_path,
                export_format='GLB',
                export_animations=True,
                use_selection=True,          # only selected objects
                export_lights=False,         # no lights
                export_cameras=False,        # no cameras
            )

            # Verify GLB was actually written
            if not os.path.exists(glb_path) or os.path.getsize(glb_path) == 0:
                props.last_status = "Error: GLB export produced an empty file — check glTF exporter is enabled"
                self.report({'ERROR'}, props.last_status)
                return {'CANCELLED'}

            # --- Optionally save .blend copy ---
            blend_path = None
            if props.include_blend:
                props.last_status = "Saving .blend copy…"
                blend_path = os.path.join(tmp_dir, 'export.blend')
                bpy.ops.wm.save_as_mainfile(filepath=blend_path, copy=True)

            # --- Detect animation clips from selected objects only ---
            clips = detect_animation_clips(exportable)

            # --- Build multipart body ---
            props.last_status = "Uploading to Volt Studio…"
            boundary = uuid.uuid4().hex

            fields = {
                'name': props.asset_name,
                'animClips': json.dumps(clips),
            }
            if props.asset_id.strip():
                fields['assetId'] = props.asset_id.strip()

            files = {}

            with open(glb_path, 'rb') as f:
                glb_bytes = f.read()
            files['glb'] = ('export.glb', glb_bytes, 'model/gltf-binary')

            if blend_path and os.path.exists(blend_path):
                with open(blend_path, 'rb') as f:
                    blend_bytes = f.read()
                files['blend'] = ('export.blend', blend_bytes, 'application/octet-stream')

            body = build_multipart(fields, files, boundary)

            # --- HTTP POST ---
            url = f"{prefs.api_url.rstrip('/')}/api/volt-3d"
            req = urllib.request.Request(
                url,
                data=body,
                method='POST',
                headers={
                    'Authorization': f'Bearer {prefs.api_key}',
                    'Content-Type': f'multipart/form-data; boundary={boundary}',
                },
            )

            with urllib.request.urlopen(req, timeout=30) as response:
                raw = response.read().decode('utf-8')

            # --- Parse response ---
            try:
                result = json.loads(raw)
            except ValueError:
                props.last_status = "Error: Server returned non-JSON response"
                self.report({'ERROR'}, props.last_status)
                return {'CANCELLED'}

            # Pull asset ID from wherever the API puts it
            data = result.get('data') or result
            new_id = data.get('assetId') or data.get('id') or ''
            version_num = data.get('versionNum') or ''

            if new_id and not props.asset_id.strip():
                props.asset_id = str(new_id)

            clips_info = f", {len(clips)} clip(s)" if clips else ", no animations"
            props.last_status = (
                f"Synced OK — {len(exportable)} obj(s){clips_info}"
                + (f" → v{version_num}" if version_num else "")
            )
            self.report({'INFO'}, props.last_status)
            return {'FINISHED'}

        except urllib.error.HTTPError as exc:
            body_text = ''
            try:
                body_text = exc.read().decode('utf-8')[:300]
            except Exception:
                pass
            props.last_status = f"Error: HTTP {exc.code} — {body_text or exc.reason}"
            self.report({'ERROR'}, props.last_status)
            return {'CANCELLED'}

        except urllib.error.URLError as exc:
            props.last_status = f"Error: Network — {exc.reason}"
            self.report({'ERROR'}, props.last_status)
            return {'CANCELLED'}

        except Exception as exc:
            props.last_status = f"Error: {exc}"
            self.report({'ERROR'}, props.last_status)
            return {'CANCELLED'}

        finally:
            if tmp_dir and os.path.exists(tmp_dir):
                shutil.rmtree(tmp_dir, ignore_errors=True)


# ---------------------------------------------------------------------------
# Panel
# ---------------------------------------------------------------------------

class VOLT_PT_sync_panel(Panel):
    """Sidebar panel in View3D > N panel > Volt tab."""

    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Volt'
    bl_label = 'Volt Studio Sync'

    def draw(self, context):
        layout = self.layout
        props = context.scene.volt_props
        prefs = context.preferences.addons[__name__].preferences

        # --- Connection status ---
        box = layout.box()
        col = box.column(align=True)
        col.label(text="API URL:", icon='URL')
        col.label(text=prefs.api_url or "(not set — open Preferences)", icon='BLANK1')
        col.label(
            text="API Key: configured ✓" if prefs.api_key else "API Key: NOT SET",
            icon='CHECKMARK' if prefs.api_key else 'ERROR',
        )

        layout.separator()

        # --- Selection info ---
        exportable = get_exportable_selected(context)
        sel_total = len(context.selected_objects)
        sel_box = layout.box()
        sel_col = sel_box.column(align=True)
        if exportable:
            sel_col.label(
                text=f"{len(exportable)} exportable object(s) selected",
                icon='CHECKMARK',
            )
            # Show object names (up to 4, then "…")
            names = [o.name for o in exportable[:4]]
            if len(exportable) > 4:
                names.append(f"… +{len(exportable) - 4} more")
            for n in names:
                sel_col.label(text=f"  • {n}", icon='BLANK1')
        elif sel_total > 0:
            sel_col.label(
                text=f"{sel_total} selected — no exportable types",
                icon='ERROR',
            )
            sel_col.label(text="Select meshes or armatures", icon='BLANK1')
        else:
            sel_col.label(text="Nothing selected", icon='INFO')
            sel_col.label(text="Select objects to export", icon='BLANK1')

        layout.separator()

        # --- Asset fields ---
        layout.prop(props, "asset_name")

        row = layout.row(align=True)
        row.prop(props, "asset_id")
        if props.asset_id.strip():
            # Button to clear the ID so the next sync creates a new asset
            op = row.operator("volt.clear_asset_id", text="", icon='X')

        layout.prop(props, "include_blend")

        layout.separator()

        # --- Sync button — greyed out if nothing exportable ---
        row = layout.row()
        row.enabled = bool(exportable)
        row.scale_y = 1.4
        row.operator("volt.sync", icon='EXPORT')

        if not exportable:
            layout.label(text="Select objects to enable sync", icon='INFO')

        layout.separator()

        # --- Status box ---
        status = props.last_status
        status_box = layout.box()
        row = status_box.row()
        is_error = status.lower().startswith("error")
        row.alert = is_error
        row.label(
            text=status,
            icon='ERROR' if is_error else ('CHECKMARK' if status.startswith("Synced OK") else 'INFO'),
        )


# ---------------------------------------------------------------------------
# Utility operators
# ---------------------------------------------------------------------------

class VOLT_OT_clear_asset_id(Operator):
    """Clear the Asset ID so the next sync creates a new asset."""

    bl_idname = "volt.clear_asset_id"
    bl_label = "Clear Asset ID"
    bl_description = "Clear the Asset ID — next sync will create a brand new asset"

    def execute(self, context):
        context.scene.volt_props.asset_id = ""
        context.scene.volt_props.last_status = "Asset ID cleared — next sync creates a new asset"
        return {'FINISHED'}


# ---------------------------------------------------------------------------
# Register / Unregister
# ---------------------------------------------------------------------------

classes = [
    VoltAddonPreferences,
    VoltSceneProps,
    VOLT_OT_sync,
    VOLT_OT_clear_asset_id,
    VOLT_PT_sync_panel,
]


def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.Scene.volt_props = PointerProperty(type=VoltSceneProps)


def unregister():
    del bpy.types.Scene.volt_props
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
