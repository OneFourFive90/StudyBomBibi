import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Sparkles } from "lucide-react";
import Link from "next/link"; // Import Link component

export default function ExamPrepPage() {
  const exams = [
    {
      id: "1",
      title: "Mid-Term Mock Exam",
      subject: "Data Structures",
      questions: 50,
      duration: "90 min",
      type: "MCQ Quiz"
    },
    {
      id: "2",
      title: "Quick Quiz: React Basics",
      subject: "Web Development",
      questions: 10,
      duration: "15 min",
      type: "MCQ Quiz"
    },
    {
      id: "3",
      title: "Final Exam Simulation",
      subject: "Operating Systems",
      questions: 100,
      duration: "180 min",
      type: "Past Year Question"
    },
    {
      id: "4",
      title: "2023 Past Year Paper",
      subject: "Calculus II",
      questions: 12,
      duration: "120 min",
      type: "Past Year Question"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Prep</h1>
          <p className="text-muted-foreground mt-2">Generate quizzes and practice papers for your exams.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/exam-prep/generator">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate New
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow bg-card text-card-foreground">
            <CardHeader>
              <div className="flex justify-between items-start gap-2">
                <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription>{exam.subject}</CardDescription>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                    exam.type === "MCQ Quiz" 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" 
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                }`}>
                    {exam.type}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    <span>{exam.questions} Questions</span>
                 </div>
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{exam.duration}</span>
                 </div>
              </div>
              <Link href={`/exam-prep/${exam.id}`}>
                <Button className="w-full">
                    Start Exam
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
