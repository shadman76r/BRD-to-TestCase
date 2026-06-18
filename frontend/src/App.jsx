import { useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [documentType, setDocumentType] = useState("SRS");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setStatus("Please upload a valid PDF file.");
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setSummary(null);
    setStatus(`Selected file: ${selectedFile.name}`);
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
      setStatus("Please upload a BRD or SRS PDF first.");
      return;
    }

    try {
      setLoading(true);
      setSummary(null);
      setStatus("Uploading and analyzing document...");

      const formData = new FormData();
      formData.append("documentType", documentType);
      formData.append("document", file);

      const response = await axios.post(
        "http://localhost:5000/generate-test-cases",
        formData,
        { responseType: "blob" }
      );

      downloadExcel(response.data);

      setSummary({
        type: documentType,
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        output: "Excel Test Case Sheet",
      });

      setStatus("Test cases generated successfully. Excel download started.");
    } catch (error) {
      console.error(error);
      setStatus("Failed to generate test cases. Please check backend terminal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="hero">
        <div className="hero-left">
          <div className="badge">AI Powered QA Assistant</div>

          <h1>
            Convert <span>BRD / SRS</span> PDFs into Excel Test Cases
          </h1>

          <p>
            Upload your requirement document and generate structured QA test
            cases with modules, scenarios, steps, expected results, priority,
            and test type.
          </p>

          <div className="hero-actions">
            <a href="#generator" className="primary-link">
              Start Generating
            </a>
            <a href="#features" className="secondary-link">
              View Features
            </a>
          </div>
        </div>

        <div className="hero-card">
          <h3>Generated Output</h3>

          <div className="preview-row">
            <span>TC ID</span>
            <strong>TC_001</strong>
          </div>

          <div className="preview-row">
            <span>Module</span>
            <strong>User Login</strong>
          </div>

          <div className="preview-row">
            <span>Scenario</span>
            <strong>Verify valid login</strong>
          </div>

          <div className="preview-row">
            <span>Expected</span>
            <strong>User logs in successfully</strong>
          </div>

          <div className="excel-chip">Excel .xlsx</div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="feature-box">
          <h3>PDF Input</h3>
          <p>Supports BRD and SRS documents in PDF format.</p>
        </div>

        <div className="feature-box">
          <h3>AI Analysis</h3>
          <p>Reads requirements and creates QA-friendly test cases.</p>
        </div>

        <div className="feature-box">
          <h3>Excel Export</h3>
          <p>Downloads structured test cases in editable Excel format.</p>
        </div>
      </section>

      <section id="generator" className="generator-section">
        <div className="generator-card">
          <div className="section-header">
            <h2>Generate Test Cases</h2>
            <p>Select document type, upload PDF, and download Excel.</p>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label>Document Type</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                disabled={loading}
              >
                <option value="BRD">BRD - Business Requirement Document</option>
                <option value="SRS">
                  SRS - Software Requirement Specification
                </option>
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
            </div>
          </div>

          {file && (
            <div className="file-info">
              <strong>{file.name}</strong>
              <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          <button onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating Test Cases..." : "Generate Excel"}
          </button>

          {status && <div className="status-box">{status}</div>}

          {loading && (
            <div className="process-box">
              <div>Reading PDF</div>
              <div>Extracting requirements</div>
              <div>Generating test cases</div>
              <div>Creating Excel file</div>
            </div>
          )}

          {summary && (
            <div className="summary-box">
              <h3>Generation Summary</h3>
              <p>
                <strong>Document Type:</strong> {summary.type}
              </p>
              <p>
                <strong>File Name:</strong> {summary.name}
              </p>
              <p>
                <strong>File Size:</strong> {summary.size}
              </p>
              <p>
                <strong>Output:</strong> {summary.output}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;