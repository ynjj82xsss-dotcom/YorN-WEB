import { HfInference } from '@huggingface/inference';
const hf = new HfInference("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");
const models = [
  "Qwen/Qwen2.5-7B-Instruct",
  "mistralai/Mistral-7B-Instruct-v0.2",
  "meta-llama/Meta-Llama-3-8B-Instruct",
  "microsoft/Phi-3-mini-4k-instruct",
  "google/gemma-1.1-7b-it"
];
async function run() {
  for(const m of models) {
    try {
      const res = await hf.chatCompletion({model: m, messages:[{role:'user',content:'Hi'}], max_tokens: 10});
      console.log(m, "OK");
    } catch(e) { console.log(m, "ERR", e.message); }
  }
}
run();
