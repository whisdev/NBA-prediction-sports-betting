import * as ort from "onnxruntime-node";
import fs from "node:fs";
import path from "node:path";

export class XgbOnnxPredictor {
  private ml?: ort.InferenceSession;
  private uo?: ort.InferenceSession;

  async load(modelDir: string): Promise<void> {
    const mlPath = path.join(modelDir, "xgb_ML.onnx");
    const uoPath = path.join(modelDir, "xgb_UO.onnx");
    if (!fs.existsSync(mlPath) || !fs.existsSync(uoPath)) {
      throw new Error(
        `Missing ONNX models under ${modelDir}. Run: python3 tools/export-onnx.py`,
      );
    }
    this.ml = await ort.InferenceSession.create(mlPath);
    this.uo = await ort.InferenceSession.create(uoPath);
  }

  async predictMlRows(rows: Float32Array[]): Promise<Float32Array[]> {
    const out: Float32Array[] = [];
    for (const row of rows) {
      const tensor = new ort.Tensor("float32", row, [1, row.length]);
      const r = await this.ml!.run({ input: tensor });
      const prob = r.probabilities as ort.Tensor | undefined;
      if (!prob?.data) throw new Error("ONNX ML model missing probabilities output");
      const buf = prob.data as Float32Array;
      out.push(Float32Array.from(buf.slice(0, 2)));
    }
    return out;
  }

  async predictUoRows(rows: Float32Array[]): Promise<Float32Array[]> {
    const out: Float32Array[] = [];
    for (const row of rows) {
      const tensor = new ort.Tensor("float32", row, [1, row.length]);
      const r = await this.uo!.run({ input: tensor });
      const prob = r.probabilities as ort.Tensor | undefined;
      if (!prob?.data) throw new Error("ONNX UO model missing probabilities output");
      const buf = prob.data as Float32Array;
      out.push(Float32Array.from(buf.slice(0, 2)));
    }
    return out;
  }
}
