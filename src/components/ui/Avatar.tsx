export function Avatar({ name, color, size = 32 }: { name: string; color?: string; size?: number }) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-semibold select-none flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: color ?? 'var(--accent-violet)',
        fontSize: size * 0.4,
      }}
      aria-label={name}
    >
      {initial}
    </div>
  )
}
