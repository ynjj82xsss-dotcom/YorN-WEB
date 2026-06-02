import { HfInference } from '@huggingface/inference';

const hf = new HfInference('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');

async function test() {
  try {
    const response = await hf.chatCompletion({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      messages: [{ role: 'user', content: 'Hello world' }],
      max_tokens: 50,
    });
    console.log(response);
  } catch (e) {
    console.error(e);
  }
}
test();
