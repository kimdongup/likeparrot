/* global AudioWorkletProcessor, registerProcessor */

class LikeParrotAudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Float32Array(2048);
    this.offset = 0;
    this.port.onmessage = (event) => {
      if (event.data?.type !== 'flush') return;
      const partial = this.offset > 0 ? this.chunk.slice(0, this.offset) : null;
      this.chunk = new Float32Array(2048);
      this.offset = 0;
      if (partial) {
        this.port.postMessage({ type: 'flushed', data: partial.buffer }, [partial.buffer]);
      } else {
        this.port.postMessage({ type: 'flushed' });
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    if (input) {
      let readOffset = 0;
      while (readOffset < input.length) {
        const copyLength = Math.min(input.length - readOffset, this.chunk.length - this.offset);
        this.chunk.set(input.subarray(readOffset, readOffset + copyLength), this.offset);
        this.offset += copyLength;
        readOffset += copyLength;

        if (this.offset === this.chunk.length) {
          const completedChunk = this.chunk;
          this.port.postMessage(completedChunk.buffer, [completedChunk.buffer]);
          this.chunk = new Float32Array(2048);
          this.offset = 0;
        }
      }
    }

    for (const output of outputs) {
      for (const channel of output) channel.fill(0);
    }
    return true;
  }
}

registerProcessor('likeparrot-audio-capture', LikeParrotAudioCaptureProcessor);
