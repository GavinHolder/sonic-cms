"use client";

import { useState } from "react";
import { useConfirm, useAlert } from "@/components/admin/ConfirmProvider";
import type { FormPageConfig, FormField } from "@/types/page";

interface FormPageEditorProps {
  page: FormPageConfig;
  onSave: (updates: Partial<FormPageConfig>) => void;
  onCancel: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Text Input", icon: "bi-input-cursor-text" },
  { value: "email", label: "Email Input", icon: "bi-envelope" },
  { value: "phone", label: "Phone Input", icon: "bi-telephone" },
  { value: "textarea", label: "Text Area", icon: "bi-textarea-t" },
  { value: "select", label: "Dropdown", icon: "bi-menu-button-wide" },
  { value: "checkbox", label: "Checkbox", icon: "bi-check-square" },
] as const;

export default function FormPageEditor({ page, onSave, onCancel }: FormPageEditorProps) {
  const askConfirm = useConfirm();
  const showAlert = useAlert();
  const [fields, setFields] = useState<FormField[]>(page.fields || []);
  const [submitAction, setSubmitAction] = useState<"email" | "webhook">(
    page.submitAction || "email"
  );
  const [emailTo, setEmailTo] = useState(page.submitConfig?.emailTo || "");
  const [webhookUrl, setWebhookUrl] = useState(page.submitConfig?.webhookUrl || "");
  const [successMessage, setSuccessMessage] = useState(
    page.submitConfig?.successMessage || "Thank you! Your submission has been received."
  );
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  const handleAddField = () => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: "text",
      label: "New Field",
      name: `field_${Date.now()}`,
      required: false,
    };
    setEditingField(newField);
    setShowFieldEditor(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldEditor(true);
  };

  const handleSaveField = (field: FormField) => {
    if (fields.find((f) => f.id === field.id)) {
      // Update existing
      setFields(fields.map((f) => (f.id === field.id ? field : f)));
    } else {
      // Add new
      setFields([...fields, field]);
    }
    setShowFieldEditor(false);
    setEditingField(null);
  };

  const handleDeleteField = async (id: string) => {
    if (await askConfirm("Delete this field?")) {
      setFields(fields.filter((f) => f.id !== id));
    }
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const newFields = [...fields];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;

    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    setFields(newFields);
  };

  const handleSave = async () => {
    if (fields.length === 0) {
      await showAlert("Please add at least one field to the form");
      return;
    }

    if (submitAction === "email" && !emailTo.trim()) {
      await showAlert("Please enter an email address for form submissions");
      return;
    }

    if (submitAction === "webhook" && !webhookUrl.trim()) {
      await showAlert("Please enter a webhook URL for form submissions");
      return;
    }

    onSave({
      fields,
      submitAction,
      submitConfig: {
        emailTo: submitAction === "email" ? emailTo.trim() : undefined,
        webhookUrl: submitAction === "webhook" ? webhookUrl.trim() : undefined,
        successMessage: successMessage.trim(),
      },
    });
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1115 }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-ui-checks me-2"></i>
              Edit Form Page
            </h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
            {/* Form Fields */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="mb-0 fw-semibold">Form Fields</h6>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleAddField}
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  Add Field
                </button>
              </div>

              {fields.length === 0 ? (
                <div className="alert alert-info">
                  <i className="bi bi-info-circle me-2"></i>
                  No fields added yet. Click "Add Field" to get started.
                </div>
              ) : (
                <div className="list-group">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="list-group-item d-flex align-items-center gap-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <strong>{field.label}</strong>
                          <span className="badge bg-secondary">{field.type}</span>
                          {field.required && (
                            <span className="badge bg-danger">Required</span>
                          )}
                        </div>
                        <small className="text-muted">Name: {field.name}</small>
                      </div>

                      <div className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleMoveField(index, "up")}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <i className="bi bi-arrow-up"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => handleMoveField(index, "down")}
                          disabled={index === fields.length - 1}
                          title="Move down"
                        >
                          <i className="bi bi-arrow-down"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditField(field)}
                          title="Edit field"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeleteField(field.id)}
                          title="Delete field"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Action */}
            <div className="mb-4">
              <h6 className="mb-3 fw-semibold">Submission Settings</h6>

              <div className="mb-3">
                <label className="form-label">Submit Action</label>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    onClick={() => setSubmitAction("email")}
                    className={`btn text-start ${
                      submitAction === "email" ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-envelope"></i>
                      <div className="flex-grow-1">
                        <strong>Send Email</strong>
                        <div className="small mt-1 opacity-75">
                          Send form data to email address
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubmitAction("webhook")}
                    className={`btn text-start ${
                      submitAction === "webhook" ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <i className="bi bi-link-45deg"></i>
                      <div className="flex-grow-1">
                        <strong>Webhook</strong>
                        <div className="small mt-1 opacity-75">
                          POST form data to webhook URL
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {submitAction === "email" && (
                <div className="mb-3">
                  <label className="form-label">
                    Email Address <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="admin@example.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                  <div className="form-text">
                    Form submissions will be sent to this email address
                  </div>
                </div>
              )}

              {submitAction === "webhook" && (
                <div className="mb-3">
                  <label className="form-label">
                    Webhook URL <span className="text-danger">*</span>
                  </label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/webhook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <div className="form-text">
                    Form data will be POSTed to this URL as JSON
                  </div>
                </div>
              )}

              <div className="mb-3">
                <label className="form-label">Success Message</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Thank you! Your submission has been received."
                  value={successMessage}
                  onChange={(e) => setSuccessMessage(e.target.value)}
                />
                <div className="form-text">
                  Message shown to users after successful submission
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={fields.length === 0}
            >
              <i className="bi bi-check-lg me-2"></i>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Field Editor Modal */}
      {showFieldEditor && editingField && (
        <FieldEditorModal
          field={editingField}
          onSave={handleSaveField}
          onCancel={() => {
            setShowFieldEditor(false);
            setEditingField(null);
          }}
        />
      )}
    </div>
  );
}

interface FieldEditorModalProps {
  field: FormField;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

function FieldEditorModal({ field, onSave, onCancel }: FieldEditorModalProps) {
  const showAlert = useAlert();
  const [type, setType] = useState(field.type);
  const [label, setLabel] = useState(field.label);
  const [name, setName] = useState(field.name);
  const [required, setRequired] = useState(field.required);
  const [placeholder, setPlaceholder] = useState(field.placeholder || "");
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>(
    (field.options || []).map((o) => typeof o === "string" ? { value: o, label: o } : o)
  );

  const handleSave = async () => {
    if (!label.trim()) {
      await showAlert("Please enter a field label");
      return;
    }

    if (!name.trim()) {
      await showAlert("Please enter a field name");
      return;
    }

    if (type === "select" && options.length === 0) {
      await showAlert("Please add at least one option for dropdown");
      return;
    }

    onSave({
      id: field.id,
      type,
      label: label.trim(),
      name: name.trim(),
      required,
      placeholder: placeholder.trim() || undefined,
      options: type === "select" ? options : undefined,
    });
  };

  const handleAddOption = () => {
    setOptions([...options, { value: "", label: "" }]);
  };

  const handleUpdateOption = (index: number, key: "value" | "label", val: string) => {
    const newOptions = [...options];
    newOptions[index][key] = val;
    setOptions(newOptions);
  };

  const handleDeleteOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: "rgba(0,0,0,0.7)", zIndex: 1120 }}
    >
      <div
        className="modal-dialog modal-dialog-centered modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Edit Field</h5>
            <button type="button" className="btn-close" onClick={onCancel}></button>
          </div>

          <div className="modal-body">
            {/* Field Type */}
            <div className="mb-3">
              <label className="form-label fw-semibold">Field Type</label>
              <select
                className="form-select"
                value={type}
                onChange={(e) => setType(e.target.value as FormField["type"])}
              >
                {FIELD_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Label <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            {/* Name */}
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Field Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="full_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="form-text">
                Used as the key in form submission data (lowercase, no spaces)
              </div>
            </div>

            {/* Required */}
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="required-check"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="required-check">
                Required field
              </label>
            </div>

            {/* Placeholder */}
            {type !== "checkbox" && type !== "select" && (
              <div className="mb-3">
                <label className="form-label">Placeholder Text</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter your name..."
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                />
              </div>
            )}

            {/* Options for Select */}
            {type === "select" && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label mb-0 fw-semibold">Options</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddOption}
                  >
                    <i className="bi bi-plus-lg me-1"></i>
                    Add Option
                  </button>
                </div>

                {options.map((opt, index) => (
                  <div key={index} className="input-group mb-2">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Value (e.g., option1)"
                      value={opt.value}
                      onChange={(e) => handleUpdateOption(index, "value", e.target.value)}
                    />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Label (e.g., Option 1)"
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(index, "label", e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={() => handleDeleteOption(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))}

                {options.length === 0 && (
                  <div className="alert alert-info small">
                    No options added yet. Click "Add Option" to create dropdown options.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              <i className="bi bi-check-lg me-2"></i>
              Save Field
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
