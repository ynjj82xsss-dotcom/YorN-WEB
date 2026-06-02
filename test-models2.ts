import { HfInference } from '@huggingface/inference';
const hf = new HfInference("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");
const models = [
  "Qwen/Qwen2.5-1.5B-Instruct",
  "Qwen/Qwen2.5-Coder-32B-Instruct",
  "meta-llama/Llama-3.2-3B-Instruct",
  "meta-llama/Llama-3.1-8B-Instruct",
  "mistralai/Mistral-Nemo-Instruct-2407"
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
