const VISIBLE_LANDMARKS = Object.freeze([0, 2, 5, 11, 12, 13, 14, 15, 16, 23, 24]);
const CONNECTIONS = Object.freeze([
  [2, 0], [0, 5],
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24]
]);

const visible = (point) => point
  && Number.isFinite(point.x)
  && Number.isFinite(point.y)
  && (point.visibility ?? 1) >= 0.55;

export function drawPoseOverlay(canvas, video, points = []) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return 0;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  canvas.hidden = false;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, width, height);

  const renderedWidth = canvas.clientWidth || video.clientWidth || width;
  const displayScale = width / Math.max(renderedWidth, 1);
  const lineWidth = Math.max(3, displayScale * 2);
  const radius = Math.max(7, displayScale * 3.5);
  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = lineWidth;
  context.strokeStyle = "#173f2d";

  for (const [from, to] of CONNECTIONS) {
    const a = points[from];
    const b = points[to];
    if (!visible(a) || !visible(b)) continue;
    context.beginPath();
    context.moveTo(a.x * width, a.y * height);
    context.lineTo(b.x * width, b.y * height);
    context.stroke();
  }

  let count = 0;
  context.fillStyle = "#b9ff6a";
  context.strokeStyle = "#173f2d";
  context.lineWidth = Math.max(2, displayScale * 1.25);
  for (const index of VISIBLE_LANDMARKS) {
    const point = points[index];
    if (!visible(point)) continue;
    context.beginPath();
    context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    count++;
  }
  return count;
}
