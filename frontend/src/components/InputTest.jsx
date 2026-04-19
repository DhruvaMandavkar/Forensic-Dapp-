import { useState } from "react";

export default function InputTest() {
  const [value, setValue] = useState("");

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Input Test</h2>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type here..."
        style={{ padding: "0.5rem", fontSize: "1rem" }}
      />
      <p>Current Value: {value}</p>
    </div>
  );
}