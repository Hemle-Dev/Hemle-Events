type InlineNode = string | { tag: "b" | "i" | "u"; children: InlineNode[] };
export type DescriptionNode = InlineNode | { tag: "ul"; items: InlineNode[][] };

// A tiny allow-list format, rendered as React nodes. Never interpret arbitrary HTML.
export function descriptionNodes(value: string, format = "plain"): DescriptionNode[] {
  if (format !== "formatted") return [value];
  const nodes: DescriptionNode[] = [];
  let offset = 0;
  for (const match of value.matchAll(/^(?:[\t ]*[-•] [^\r\n]*(?:\r?\n|$))+/gm)) {
    nodes.push(...inlineNodes(value.slice(offset, match.index)));
    nodes.push({
      tag: "ul",
      items: match[0]
        .replace(/\r?\n$/, "")
        .split(/\r?\n/)
        .map((line) => inlineNodes(line.replace(/^[\t ]*[-•] /, ""))),
    });
    offset = match.index! + match[0].length;
  }
  nodes.push(...inlineNodes(value.slice(offset)));
  return nodes;
}

function inlineNodes(value: string): InlineNode[] {
  const root: InlineNode[] = [];
  const stack: { tag: "b" | "i" | "u"; children: InlineNode[] }[] = [];
  const current = () => stack.at(-1)?.children ?? root;
  let offset = 0;
  for (const match of value.matchAll(/\[(\/)?(b|i|u)\]/g)) {
    current().push(value.slice(offset, match.index));
    const tag = match[2] as "b" | "i" | "u";
    if (!match[1] && stack.length < 16) stack.push({ tag, children: [] });
    else if (match[1] && stack.at(-1)?.tag === tag) {
      const node = stack.pop()!;
      current().push(node);
    } else current().push(match[0]);
    offset = match.index! + match[0].length;
  }
  current().push(value.slice(offset));
  while (stack.length) {
    const node = stack.pop()!;
    current().push(`[${node.tag}]`, ...node.children);
  }
  return root;
}

export function plainDescription(value: string, format = "plain"): string {
  const flatten = (nodes: DescriptionNode[]): string =>
    nodes
      .map((node) => {
        if (typeof node === "string") return node;
        if (node.tag === "ul") return `\n${node.items.map(flatten).join("\n")}\n`;
        return flatten(node.children);
      })
      .join("");
  return flatten(descriptionNodes(value, format));
}

export function formatBulletSelection(value: string, start: number, end: number) {
  const from = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  // A selection ending at the start of the next line must not modify that line.
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const nextLine = value.indexOf("\n", last);
  const to = nextLine === -1 ? value.length : nextLine;
  const lines = value.slice(from, to).split("\n");
  const hasText = lines.some((line) => line.trim());
  const remove =
    hasText && lines.filter((line) => line.trim()).every((line) => /^[\t ]*[-•] /.test(line));
  const replacement = hasText
    ? lines
        .map((line) => {
          if (!line.trim()) return line;
          if (remove) return line.replace(/^([\t ]*)[-•] /, "$1");
          return /^[\t ]*[-•] /.test(line) ? line : `- ${line}`;
        })
        .join("\n")
    : "- Votre texte";
  return {
    value: value.slice(0, from) + replacement + value.slice(to),
    start: hasText ? from : from + 2,
    end: from + replacement.length,
  };
}

export function formatSelection(value: string, start: number, end: number, tag: "b" | "i" | "u") {
  const selectedLines = value.slice(start, end).split("\n");
  if (selectedLines.length && selectedLines.every((line) => /^[\t ]*[-•] /.test(line))) {
    // Keep list markers outside inline tags when styling an entire list.
    const replacement = selectedLines
      .map((line) =>
        line.replace(
          /^([\t ]*[-•] )(.*)$/,
          (_match, marker: string, text: string) => `${marker}[${tag}]${text}[/${tag}]`,
        ),
      )
      .join("\n");
    return {
      value: value.slice(0, start) + replacement + value.slice(end),
      start,
      end: start + replacement.length,
    };
  }
  if (value.slice(start - 3, start) === `[${tag}]` && value.slice(end, end + 4) === `[/${tag}]`) {
    return {
      value: value.slice(0, start - 3) + value.slice(start, end) + value.slice(end + 4),
      start: start - 3,
      end: end - 3,
    };
  }
  const selection = value.slice(start, end) || "Votre texte";
  return {
    value: `${value.slice(0, start)}[${tag}]${selection}[/${tag}]${value.slice(end)}`,
    start: start + 3,
    end: start + 3 + selection.length,
  };
}
