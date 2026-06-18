import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [documentType, setDocumentType] = useState("BRD");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setStatus("❌ Please upload only PDF file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setStatus(`✅ Selected file: ${selectedFile.name}`);
    setSummary(null);
  };

  const downloadExcel = (blobData) => {
    const url = window.URL.createObjectURL(new Blob([blobData]));
    const link = document.createElement("a");

    link.href = url;
    link.download = `${documentType}_Test_Cases.xlsx`;
    document.body.appendChild(link);
    link.click();

    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!file) {
      setStatus("❌ Please upload a BRD or SRS PDF first.");
      return;
    }

    try {
      setLoading(true);
      setSummary(null);

      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("document", file);

      setStatus("📤 Uploading PDF...");

      const response = await axios.post(
        "http://localhost:5000/generate-test-cases",
        formData,
        {
          responseType: "blob",
        }
      );

      setStatus("✅ Excel generated successfully. Download started.");

      downloadExcel(response.data);

      setSummary({
        documentType,
        fileName: file.name,
        fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        output: "Excel (.xlsx)",
        status: "Completed",
      });
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to generate test cases. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <div className="header">
          <h1>BRD / SRS To Test Case Generator</h1>
          <p className="subtitle">
            Upload a BRD or SRS PDF and generate detailed test cases in Excel format.
          </p>
        </div>

        <div className="form-box">
          <div className="input-group">
            <label>Document Type</label>
            <select
              value={documentType}
              onChange={(e) => {
                setDocumentType(e.target.value);
                setSummary(null);
              }}
              disabled={loading}
            >
              <option value="BRD">BRD - Business Requirement Document</option>
              <option value="SRS">SRS - Software Requirement Specification</option>
            </select>
          </div>

          <div className="input-group">
            <label>Upload PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={loading}
            />
            {file && <small>Selected: {file.name}</small>}
          </div>

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating Test Cases..." : "Generate Excel Test Cases"}
          </button>
        </div>

        {status && <div className="status-box">{status}</div>}

        {loading && (
          <div className="process-box">
            <h3>Processing Document</h3>
            <ul>
              <li>Reading uploaded PDF</li>
              <li>Extracting requirements</li>
              <li>Finding modules and rules</li>
              <li>Generating test scenarios</li>
              <li>Creating Excel file</li>
            </ul>
          </div>
        )}

        {summary && (
          <div className="summary-box">
            <h3>Generation Summary</h3>
            <p>
              <strong>Document Type:</strong> {summary.documentType}
            </p>
            <p>
              <strong>File Name:</strong> {summary.fileName}
            </p>
            <p>
              <strong>File Size:</strong> {summary.fileSize}
            </p>
            <p>
              <strong>Output:</strong> {summary.output}
            </p>
            <p>
              <strong>Status:</strong> {summary.status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;