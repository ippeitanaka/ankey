import Image from "next/image"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-full ${className}`}>
      <Image
        src="/images/tmc-ankey-logo.png"
        alt="TMC AnKey Logo"
        width={120}
        height={120}
        className="object-contain"
      />
    </div>
  )
}
