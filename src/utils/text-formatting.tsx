import React from "react";

/**
 * Normalizes browser-generated rich text HTML to standard clean HTML tags (<b>, <i>, <u>, <s>),
 * and replaces <br> line breaks with newline characters (\n) for clean database storage.
 */
export function normalizeHTML(text: string | null): string {
  if (!text) return "";
  return (
    text
      // Convert <strong> to <b>
      .replace(/<strong\b[^>]*>/gi, "<b>")
      .replace(/<\/strong>/gi, "</b>")
      // Convert <em> to <i>
      .replace(/<em\b[^>]*>/gi, "<i>")
      .replace(/<\/em>/gi, "</i>")
      // Convert <strike> to <s>
      .replace(/<strike\b[^>]*>/gi, "<s>")
      .replace(/<\/strike>/gi, "</s>")
      // Convert <del> to <s>
      .replace(/<del\b[^>]*>/gi, "<s>")
      .replace(/<\/del>/gi, "</s>")
      // Convert <br> or <br/> to \n
      .replace(/<br\s*\/?>/gi, "\n")
      // Remove other div/p tags that browser might inject on newlines, keeping simple \n
      .replace(/<div\b[^>]*>/gi, "")
      .replace(/<\/div>/gi, "\n")
      .replace(/<p\b[^>]*>/gi, "")
      .replace(/<\/p>/gi, "\n")
      // Clean up trailing and double newlines that might occur from stripping divs
      .replace(/\n\n+/g, "\n")
      .trim()
  );
}

/**
 * Safely parses and renders standard formatting HTML tags (<b>, <i>, <u>, <s>)
 * inside a block of text, escaping all other characters to prevent XSS.
 */
export function renderFormattedText(text: string | null): React.ReactNode {
  if (!text) return null;

  // Normalize formatting tags first
  const cleanText = normalizeHTML(text);

  // Split text by standard formatting HTML tags: <b>, <i>, <u>, <s> and their closings
  const parts = cleanText.split(/(<\/?[bius]>)/gi);
  const stack: string[] = [];

  return parts.map((part, index) => {
    const lowerPart = part.toLowerCase();
    if (lowerPart === "<b>") {
      stack.push("b");
      return null;
    }
    if (lowerPart === "</b>") {
      if (stack[stack.length - 1] === "b") stack.pop();
      return null;
    }
    if (lowerPart === "<i>") {
      stack.push("i");
      return null;
    }
    if (lowerPart === "</i>") {
      if (stack[stack.length - 1] === "i") stack.pop();
      return null;
    }
    if (lowerPart === "<u>") {
      stack.push("u");
      return null;
    }
    if (lowerPart === "</u>") {
      if (stack[stack.length - 1] === "u") stack.pop();
      return null;
    }
    if (lowerPart === "<s>") {
      stack.push("s");
      return null;
    }
    if (lowerPart === "</s>") {
      if (stack[stack.length - 1] === "s") stack.pop();
      return null;
    }

    // It's a text part. Apply all styles currently active in stack.
    let element: React.ReactNode = part;
    for (let i = stack.length - 1; i >= 0; i--) {
      const tag = stack[i];
      if (tag === "b") {
        element = <strong key={`${index}-${i}`}>{element}</strong>;
      } else if (tag === "i") {
        element = <em key={`${index}-${i}`}>{element}</em>;
      } else if (tag === "u") {
        element = <u key={`${index}-${i}`}>{element}</u>;
      } else if (tag === "s") {
        element = <s key={`${index}-${i}`}>{element}</s>;
      }
    }
    return <span key={index}>{element}</span>;
  });
}

/**
 * Strips formatting HTML tags (<b>, <i>, <u>, <s>) from a string.
 * Useful for hover title tooltip representation.
 */
export function stripFormattingTags(text: string | null): string {
  if (!text) return "";
  const clean = normalizeHTML(text);
  return clean.replace(/<\/?[bius]>/gi, "");
}
