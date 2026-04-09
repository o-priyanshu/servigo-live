import Image from "next/image";

const LeftPanel = () => {
  return (
    <div className="hidden lg:flex relative w-1/2 h-screen overflow-hidden">
      <Image
        src="/images/onboarding-hero.jpg"
        alt="Professional service workers in a modern home"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 gradient-overlay" />
      <div className="relative z-10 flex flex-col justify-end p-12 pb-16">
        <h1 className="text-4xl xl:text-5xl font-bold text-primary-foreground leading-tight mb-4">
          Your journey to a<br />better home starts here.
        </h1>
        <p className="text-primary-foreground/70 text-lg max-w-md">
          Join thousands of homeowners and professionals on ServiGo.
        </p>
      </div>
    </div>
  );
};

export default LeftPanel;