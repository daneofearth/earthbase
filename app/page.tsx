import EarthBackground from "@/components/earth/EarthBackground";
import SiteText from "@/components/SiteText";
import { getActiveConfig } from "@/lib/earthConfigStore";

// Cached and served statically, but not frozen at build time: the tuner calls
// revalidatePath('/') whenever the active preset changes, so a save is live
// immediately. The interval is only a backstop for changes made outside the
// app — editing a row in Supabase directly, say.
export const revalidate = 300;

export default async function Home() {
  const config = await getActiveConfig();

  return (
    // `relative` matters: both the background and the text block are absolutely
    // positioned, so without a positioned ancestor they escape to the body.
    <section className="relative flex min-h-screen flex-1 overflow-hidden">
      <EarthBackground config={config} />
      <SiteText config={config} />
    </section>
  );
}
