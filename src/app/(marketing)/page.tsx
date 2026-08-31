import Hero from "@/components/Hero";
import LogoCloud from "@/components/LogoCloud";
import FindProgram from "@/components/FindProgram";
import FeatureSections from "@/components/FeatureSections";

export default function HomePage() {
  return (
    <div className="rainbow-bg-tint">
      <Hero />
      <LogoCloud />
      <FindProgram />
      <FeatureSections />
    </div>
  );
}