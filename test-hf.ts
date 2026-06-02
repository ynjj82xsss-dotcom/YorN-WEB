import { HfInference } from '@huggingface/inference';

const hf = new HfInference('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');

async function test() {
  try {
    const response = await hf.textGeneration({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      inputs: 'Hello world',
    });
    console.log(response);
  } catch (e) {
    console.error(e);
  }
}
test();
