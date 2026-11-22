import type { Prefs } from "../core/state";
// All sound is synthesized locally. A voice is started only after a user gesture.
export class Soundscape {
  private ctx?: AudioContext;
  private gain?: GainNode;
  private motor?: OscillatorNode;
  private motorGain?: GainNode;
  private seaGain?: GainNode;
  private radio?: GainNode;
  private seq = 0;
  station = 0;
  private stationTimer = 0;
  apply(p: Prefs) {
    if (this.ctx && this.gain)
      this.gain.gain.setTargetAtTime(
        p.muted ? 0 : p.volume * 0.4,
        this.ctx.currentTime,
        0.08,
      );
  }
  async unlock(p: Prefs) {
    if (p.muted && !this.ctx) return;
    if (!this.ctx) {
      const c = (this.ctx = new AudioContext()),
        gain = (this.gain = c.createGain());
      gain.gain.value = 0;
      gain.connect(c.destination);
      const buffer = c.createBuffer(1, c.sampleRate * 2, c.sampleRate),
        data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        data[i] = last * 3;
      }
      const waves = c.createBufferSource();
      waves.buffer = buffer;
      waves.loop = true;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      this.seaGain = c.createGain();
      this.seaGain.gain.value = 0.2;
      const seaPos = c.createPanner();
      seaPos.panningModel = "equalpower";
      seaPos.positionX.value = 8;
      seaPos.positionZ.value = -5;
      seaPos.refDistance = 8;
      waves.connect(filter).connect(this.seaGain).connect(seaPos).connect(gain);
      waves.start();
      this.motor = c.createOscillator();
      this.motor.type = "triangle";
      this.motorGain = c.createGain();
      this.motorGain.gain.value = 0;
      this.motor.connect(this.motorGain).connect(gain);
      this.motor.start();
      this.radio = c.createGain();
      this.radio.gain.value = 0.11;
      this.radio.connect(gain);
    }
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.apply(p);
  }
  update(speed: number, driving: boolean, coast: boolean) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.motor!.frequency.setTargetAtTime(30 + Math.abs(speed) * 2.5, t, 0.09);
    this.motorGain!.gain.setTargetAtTime(driving ? 0.15 : 0, t, 0.15);
    this.seaGain!.gain.setTargetAtTime(coast ? 0.37 : 0.07, t, 0.6);
    if (this.station && driving && t > this.stationTimer) {
      const notes =
        this.station === 1
          ? [55, 65.4, 82.4, 98, 110, 82.4, 73.4, 65.4]
          : [82.4, 98, 123.5, 146.8, 164.8, 123.5, 98, 92.5];
      this.note(notes[this.seq++ % 8], 0.23, 0.12);
      this.stationTimer = t + (this.station === 1 ? 0.28 : 0.38);
    }
  }
  note(freq: number, duration = 0.1, vol = 0.12) {
    if (!this.ctx || !this.gain) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.gain);
    o.start();
    o.stop(t + duration + 0.01);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  stop() {
    if (!this.ctx) return;
    this.motorGain!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.08);
    this.seaGain!.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
  }
}
