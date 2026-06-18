const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
// const pdfParseModule = require("pdf-parse");
// const pdfParse = pdfParseModule.default || pdfParseModule;
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const uploadsDir = path.join(__dirname, "uploads");
const outputDir = path.join(__dirname, "output");

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const upload = multer({
  dest: uploadsDir,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

app.get("/", (req, res) => {
  res.send("BRD/SRS Test Case Generator API Running");
});

function cleanGeminiJson(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

async function generateTestCasesWithGemini(documentType, pdfText) {
  const limitedText = pdfText.slice(0, 30000);

  const prompt = `
You are a senior QA engineer.

Generate detailed software test cases from this ${documentType} document.

Return ONLY valid JSON array. No markdown. No explanation.

Each item must have:
{
  "module": "",
  "requirementId": "",
  "requirement": "",
  "testScenario": "",
  "testSteps": "",
  "testData": "",
  "expectedResult": "",
  "priority": "High/Medium/Low",
  "testType": "Positive/Negative/Boundary/UI/Functional"
}

Document text:
${limitedText}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const rawText = response.text;
  const cleaned = cleanGeminiJson(rawText);

  return JSON.parse(cleaned);
}

async function createExcel(documentType, testCases) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Test Cases");

  worksheet.columns = [
    { header: "TC ID", key: "tcId", width: 12 },
    { header: "Document Type", key: "documentType", width: 15 },
    { header: "Module", key: "module", width: 25 },
    { header: "Requirement ID", key: "requirementId", width: 18 },
    { header: "Requirement", key: "requirement", width: 45 },
    { header: "Test Scenario", key: "testScenario", width: 40 },
    { header: "Test Steps", key: "testSteps", width: 50 },
    { header: "Test Data", key: "testData", width: 30 },
    { header: "Expected Result", key: "expectedResult", width: 45 },
    { header: "Priority", key: "priority", width: 15 },
    { header: "Test Type", key: "testType", width: 18 },
  ];

  worksheet.getRow(1).font = { bold: true };

  testCases.forEach((tc, index) => {
    worksheet.addRow({
      tcId: `TC_${String(index + 1).padStart(3, "0")}`,
      documentType,
      module: tc.module || "General",
      requirementId: tc.requirementId || `REQ_${index + 1}`,
      requirement: tc.requirement || "",
      testScenario: tc.testScenario || "",
      testSteps: tc.testSteps || "",
      testData: tc.testData || "",
      expectedResult: tc.expectedResult || "",
      priority: tc.priority || "Medium",
      testType: tc.testType || "Functional",
    });
  });

  const fileName = `${documentType}_TestCases_${Date.now()}.xlsx`;
  const filePath = path.join(outputDir, fileName);

  await workbook.xlsx.writeFile(filePath);

  return filePath;
}

app.post("/generate-test-cases", upload.single("document"), async (req, res) => {
  let uploadedFilePath;

  try {
    const { documentType } = req.body;

    if (!documentType) {
      return res.status(400).json({ message: "Document type is required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "PDF file is required" });
    }

    uploadedFilePath = req.file.path;

    const pdfBuffer = fs.readFileSync(uploadedFilePath);
    const pdfData = await pdfParse(pdfBuffer);

    if (!pdfData.text || pdfData.text.trim().length < 50) {
      return res.status(400).json({
        message: "Could not read enough text from this PDF",
      });
    }

    const testCases = await generateTestCasesWithGemini(
      documentType,
      pdfData.text
    );

    const excelPath = await createExcel(documentType, testCases);

    res.download(excelPath, `${documentType}_Test_Cases.xlsx`, () => {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
    });
  } catch (error) {
    console.error("Error:", error);

    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      fs.unlinkSync(uploadedFilePath);
    }

    res.status(500).json({
      message: "Failed to generate test cases",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});