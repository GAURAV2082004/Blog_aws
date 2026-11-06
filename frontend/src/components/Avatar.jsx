import { initials, hue } from '../util.js';

export default function Avatar({ name, seed, size = 32 }) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hue(seed || name)} 45% 38%)` }}
    >
      {initials(name)}
    </span>
  );
}
