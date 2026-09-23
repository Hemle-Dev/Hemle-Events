import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { DateTimeInput } from "../../src/components/date-time-input";
import { DescriptionEditor } from "../../src/components/description-editor";
import "../../src/styles.css";

export function EditorFixture() {
  const [description, setDescription] = useState("Bonjour monde");
  const [format, setFormat] = useState("plain");
  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <h1>Champs événement — test local</h1>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <DateTimeInput type="date" aria-label="la date de début" defaultValue="2026-09-23" />
        <DateTimeInput type="date" aria-label="la date de fin" defaultValue="2026-09-24" />
        <DateTimeInput type="time" aria-label="l’heure de début" defaultValue="18:00" />
        <DateTimeInput
          type="datetime-local"
          aria-label="la publication"
          defaultValue="2026-09-23T18:00"
        />
      </div>
      <DescriptionEditor
        value={description}
        format={format}
        onChange={(value, nextFormat) => {
          setDescription(value);
          setFormat(nextFormat);
        }}
      />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<EditorFixture />);
