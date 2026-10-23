// Text stand-in for the live site's /logo_cropped.png. Drop that file into /public
// and swap this for <Image src="/logo_cropped.png" ...> to use the real logo.
export function Logo() {
  return (
    <span className="flex items-center gap-2 leading-none">
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent-strong text-sm font-black text-white">S</span>
      <span className="flex flex-col">
        <span className="text-base font-black tracking-[0.2em]">SWISS</span>
        <span className="text-[10px] font-semibold tracking-[0.25em] text-muted">PROPERTIES</span>
      </span>
    </span>
  );
}
