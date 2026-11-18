import { Announcement } from "../components/Announcement";
import { Navbar } from "../components/Navbar";
import { Hero } from "../components/Hero";
import { About } from "../components/About";
import { Departments } from "../components/Departments";
import { Works } from "../components/Works";
import { Stats } from "../components/Stats";
import { Recruit } from "../components/Recruit";
import { Footer } from "../components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Announcement />
        <Works />
        <About />
        <Departments />
        <Stats />
        <Recruit />
      </main>
      <Footer />
    </>
  );
}
