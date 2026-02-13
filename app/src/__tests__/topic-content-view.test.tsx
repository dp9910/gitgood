import { describe, it, expect, vi } from "vitest";
import { renderMarkdown } from "../components/topic-content-view";

describe("renderMarkdown", () => {
  it("renders headings", () => {
    const html = renderMarkdown("## My Heading");
    expect(html).toContain("<h2");
    expect(html).toContain("My Heading");
  });

  it("renders h3 headings", () => {
    const html = renderMarkdown("### Subheading");
    expect(html).toContain("<h3");
    expect(html).toContain("Subheading");
  });

  it("renders paragraphs", () => {
    const html = renderMarkdown("This is a paragraph.");
    expect(html).toContain("<p");
    expect(html).toContain("This is a paragraph.");
  });

  it("renders bold text", () => {
    const html = renderMarkdown("This is **bold** text.");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders italic text", () => {
    const html = renderMarkdown("This is *italic* text.");
    expect(html).toContain("<em>italic</em>");
  });

  it("renders inline code", () => {
    const html = renderMarkdown("Use the `Value` class.");
    expect(html).toContain("<code");
    expect(html).toContain("Value");
  });

  it("renders code blocks with language", () => {
    const md = "```python\nprint('hello')\n```";
    const html = renderMarkdown(md);
    expect(html).toContain("python");
    expect(html).toContain("print('hello')");
    expect(html).toContain("<pre");
  });

  it("renders unordered lists", () => {
    const md = "- Item one\n- Item two";
    const html = renderMarkdown(md);
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Item one");
    expect(html).toContain("Item two");
  });

  it("renders numbered lists", () => {
    const md = "1. First\n2. Second";
    const html = renderMarkdown(md);
    expect(html).toContain("<ul");
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });

  it("escapes HTML entities", () => {
    const html = renderMarkdown("Use <div> and &amp;");
    expect(html).toContain("&lt;div&gt;");
    expect(html).toContain("&amp;amp;");
  });

  it("handles empty input", () => {
    const html = renderMarkdown("");
    expect(html).toBe("");
  });

  it("handles complex mixed content", () => {
    const md = `## Overview

This is about **Value** class.

### Code Example

\`\`\`python
x = Value(2.0)
\`\`\`

- Point one
- Point two`;

    const html = renderMarkdown(md);
    expect(html).toContain("<h2");
    expect(html).toContain("<h3");
    expect(html).toContain("<strong>Value</strong>");
    expect(html).toContain("<pre");
    expect(html).toContain("<ul");
  });
});
