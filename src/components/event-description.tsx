import type { ReactNode } from "react";
import { descriptionNodes, type DescriptionNode } from "@/lib/description";

export function EventDescription({ value, format = "plain" }: { value: string; format?: string }) {
  const render = (nodes: DescriptionNode[]): ReactNode =>
    nodes.map((node, index) => {
      if (typeof node === "string") return node;
      if (node.tag === "ul") {
        return (
          <ul key={index} className="my-3 list-disc space-y-1 pl-6">
            {node.items.map((item, itemIndex) => (
              <li key={itemIndex}>{render(item)}</li>
            ))}
          </ul>
        );
      }
      const Tag = node.tag === "b" ? "strong" : node.tag === "i" ? "em" : "u";
      return <Tag key={index}>{render(node.children)}</Tag>;
    });
  return (
    <div className="whitespace-pre-wrap break-words leading-relaxed">
      {render(descriptionNodes(value, format))}
    </div>
  );
}
