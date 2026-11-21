const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));

// Operate in screen pixels so the same hand movement gets the same correction
// at different zoom levels. Keep the original timestamps and brush sensors.
export class FreehandPath {
  constructor(scale, constant, fast, speedMode) {
    this.scale = scale;
    this.constant = constant;
    this.fast = speedMode === 'reduce' ? -fast : fast;
    this.vx = this.vy = this.activity = 0;
    this.strength = constant;
  }

  position(point, previous) {
    if (!this.constant && this.fast <= 0) return point;
    if (!previous) {
      this.x = this.trendX = point.x;
      this.y = this.trendY = point.y;
      return point;
    }

    const {scale} = this;
    const dt = Math.max(1, point.t - previous.t);
    const dx = point.x - previous.x, dy = point.y - previous.y;
    const length = Math.hypot(dx, dy) * scale;
    const speed = length / dt;
    const last = this.motion;
    this.motion = {dx, dy, length};
    const heading = Math.hypot(this.vx, this.vy);
    // A large turn on a coherent approach is a corner. Small alternating
    // movements keep passing through the position filter as hand tremor.
    const shorterMove = Math.min(length, last?.length ?? 0);
    const steadyApproach = last && heading > .045 && heading >= .94 * this.activity &&
      (last.dx * this.vx + last.dy * this.vy) * scale >= .94 * last.length * heading;
    const corner = shorterMove >= (steadyApproach ? .45 : 7) &&
      (last.dx * dx + last.dy * dy) * scale * scale < .65 * last.length * length;
    this.corner = corner;

    const velocityWeight = last && !corner ? -Math.expm1(-dt / 28) : 1;
    this.vx += (dx * scale / dt - this.vx) * velocityWeight;
    this.vy += (dy * scale / dt - this.vy) * velocityWeight;
    this.activity += (speed - this.activity) * velocityWeight;
    const travelSpeed = Math.hypot(this.vx, this.vy);
    const pace = clamp(travelSpeed / .95);
    const strength = this.strength = clamp(this.constant + this.fast * pace);
    if (!strength || corner) {
      this.x = this.trendX = point.x;
      this.y = this.trendY = point.y;
      return point;
    }

    // Two time-based position averages estimate a trend without amplifying
    // the changes in direction between individual input points.
    const time = strength * (1 + 72 * (1 - pace) ** 2);
    const weight = -Math.expm1(-dt / time);
    this.x += (point.x - this.x) * weight;
    this.y += (point.y - this.y) * weight;
    this.trendX += (this.x - this.trendX) * weight;
    this.trendY += (this.y - this.trendY) * weight;
    let offsetX = (point.x - this.x - (this.x - this.trendX)) * scale;
    let offsetY = (point.y - this.y - (this.y - this.trendY)) * scale;
    // When the pen stops, keep the estimate from creeping past the contact.
    if (length < .04 && travelSpeed > .025) {
      const ux = this.vx / travelSpeed, uy = this.vy / travelSpeed;
      const overshoot = Math.min(0, offsetX * ux + offsetY * uy);
      offsetX -= overshoot * ux;
      offsetY -= overshoot * uy;
    }
    const bound = strength * (9 - 4 * pace);
    const limit = Math.min(1, bound / Math.max(1e-9, Math.hypot(offsetX, offsetY)));
    return {...point, x: point.x - offsetX * limit / scale, y: point.y - offsetY * limit / scale};
  }

  // Estimate the local curve from the two latest observed chords. The curve
  // moves monotonically along its chord, stays close to it, and lands on the
  // observed endpoint. A corner starts a straight segment immediately.
  segment(earlier, start, end) {
    const previousTangent = this.tangent;
    this.tangent = undefined;
    if (!earlier || !this.strength || this.corner) return null;
    const {scale} = this;
    const ax = start.x - earlier.x, ay = start.y - earlier.y;
    const dx = end.x - start.x, dy = end.y - start.y;
    const before = Math.hypot(ax, ay), length = Math.hypot(dx, dy);
    if (Math.min(before, length) * scale < 1.5) return null;
    const turn = Math.atan2(ax * dy - ay * dx, ax * dx + ay * dy);
    if (Math.abs(turn) >= .85) return null;

    const amount = Math.min(1, this.strength * 5);
    const bend = clamp(turn * length / (before + length), -.42, .42) * amount;
    const heading = Math.atan2(dy, dx);
    let startBend = -bend;
    if (previousTangent !== undefined) {
      const relative = Math.atan2(Math.sin(previousTangent - heading), Math.cos(previousTangent - heading));
      if (Math.abs(relative - startBend) < .22 && Math.abs(relative) <= .42) startBend = relative;
    }
    const limit = Math.min(length * .15, 12 / scale);
    const first = clamp(Math.tan(startBend) * length / 3, -limit, limit);
    const last = clamp(-Math.tan(bend) * length / 3, -limit, limit);
    const deviation = Math.max(Math.abs(first), Math.abs(last));
    if (deviation * scale < .13) return null;
    this.tangent = heading + Math.atan2(-last, length / 3);

    // Bound the number of segments even for a sparse sample on a large canvas.
    const tolerance = .22 / Math.max(1, scale);
    const steps = clamp(Math.ceil(Math.sqrt(2 * deviation / tolerance)), 2, 12);
    return {steps, nx: -dy / length, ny: dx / length, first, last};
  }
}
