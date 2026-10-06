import { useEffect, useState } from "react";
import { supabase, friendlyError } from "@/lib/supabase";
import type { Question } from "@/types";

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from("questions")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });
        if (dbError) throw dbError;
        if (active) setQuestions((data as Question[]) ?? []);
      } catch (err) {
        if (active) setError(friendlyError(err, "We couldn't load the questions right now."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const primaryQuestions = questions.filter((q) => !q.is_supporting).sort((a, b) => a.display_order - b.display_order);
  const supportingQuestions = questions.filter((q) => q.is_supporting);

  return { questions, primaryQuestions, supportingQuestions, isLoading, error };
}
