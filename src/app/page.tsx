"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sparkles, Library, BookOpen, GraduationCap, Bot, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-hidden">
      {/* Sticky Header with Glassmorphism */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6 h-16 flex items-center transition-all">
        <Link className="flex items-center justify-center gap-2 transition-transform hover:scale-105" href="/">
          <div className="bg-primary/10 p-1.5 rounded-lg">
             <Image src="/favicon.ico" alt="StudyBomBibi" width={20} height={20} className="w-5 h-5" unoptimized />
          </div>
          <span className="text-xl font-bold tracking-tight">StudyBomBibi</span>
        </Link>
        <nav className="ml-auto flex items-center gap-4 sm:gap-6">
          <ThemeToggle />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/login">
            <Button size="sm" className="hidden sm:flex gap-2">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* --- Hero Section --- */}
        <section className="relative w-full py-20 md:py-32 lg:py-40 flex justify-center overflow-hidden">
          {/* Decorative background blobs */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[100px] -z-10" />
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[80px] -z-10" />

          <div className="container px-4 md:px-6 relative z-10">
            <div className="flex flex-col items-center space-y-8 text-center">
              <div className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
                Your AI-Powered Study Companion
              </div>
              
              <div className="space-y-4 max-w-3xl">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                  Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">Smarter</span>,<br className="hidden sm:block" /> Not Harder
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl leading-relaxed">
                  The all-in-one AI study platform. Generate personalized study plans, dynamic quizzes, and chat directly with your course materials.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full h-12 px-8 text-base gap-2 group">
                    Start Learning Free
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="#features" className="w-full sm:w-auto">
                  <Button variant="ghost" size="lg" className="w-full h-12 px-8 text-base">
                    How it Works
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* --- Features Section --- */}
        <section id="features" className="w-full py-20 md:py-32 bg-muted/30 border-y flex justify-center">
          <div className="container px-4 md:px-6"> 
            
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to ace your exams</h2>
              <p className="max-w-[800px] text-muted-foreground md:text-lg">
                We replaced messy folders and static PDFs with a smart, interactive study environment.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-muted-foreground/20">
                <CardHeader>
                  <BookOpen className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>AI Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
                    Customized study plans generated by AI based on your schedule and preferred learning style.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-muted-foreground/20">
                <CardHeader>
                  <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Library className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl">Centralized Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
                    Upload and organize all your lecture notes and slides. Supported formats: PDF, Images, Text, and CSV.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-muted-foreground/20">
                <CardHeader>
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Bot className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-xl">AI Assistant</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
                    Chat directly with your notes. Get instant answers and simple explanations for complex topics.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-muted-foreground/20">
                <CardHeader>
                  <div className="bg-amber-100 dark:bg-amber-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <GraduationCap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-xl">Smart Exam Prep</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
                    Generate MCQs and past-year-style mock exams to test your knowledge before the real thing.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* --- Bottom CTA Section --- */}
        <section className="w-full py-20 lg:py-32 flex justify-center relative overflow-hidden">
          <div className="container px-4 md:px-6 relative z-10 text-center flex flex-col items-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Ready to boost your grades?</h2>
            <p className="text-muted-foreground mb-8 text-lg max-w-[600px]">
              Join students who are already learning faster and remembering more with StudyBomBibi.
            </p>
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-base gap-2 group">
                Create Your Free Account
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* --- Footer --- */}
      <footer className="flex flex-col gap-4 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/20">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm text-muted-foreground font-medium">© 2026 StudyBomBibi. All rights reserved.</p>
        </div>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#">
            Terms of Service
          </Link>
          <Link className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#">
            Privacy Policy
          </Link>
          <Link className="text-sm text-muted-foreground hover:text-foreground transition-colors" href="#">
            Contact
          </Link>
        </nav>
      </footer>
    </div>
  );
}