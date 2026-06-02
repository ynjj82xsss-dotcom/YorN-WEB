import { HfInference } from '@huggingface/inference';

const hf = new HfInference('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');

async function test() {
  try {
    const response = await hf.chatCompletion({
      model: 'Qwen/Qwen2.5-7B-Instruct',
      messages: [{ role: 'user', content: 'Hello world' }],
      max_tokens: 50,
    });
    console.log(response);
  } catch (e: any) {
    if (e.httpResponse) {
      console.log(JSON.stringify(e.httpResponse, null, 2));
    } else {
      console.error(e);
    }
  }
}
test();
