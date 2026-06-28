import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { KeyTermsEditorClient } from "./KeyTermsEditorClient";

import {
  KeyTermDB,
  CategoryDB,
  LoopKeyTermDB,
  TemplateDB,
  SceneDB,
  LoopDB,
} from "@/types/key-terms";

export default async function KeyTermsEditorPage() {
  const supabase = await createClient();

  // Validate user auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Validate admin role
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    redirect("/dashboard");
  }

  // Fetch all Key Terms
  const { data: keyTerms } = await supabase
    .from("key_terms")
    .select("*")
    .order("term");

  // Fetch all Loop relations
  const { data: loopKeyTerms } = await supabase
    .from("loop_key_terms")
    .select("*");

  // Fetch Categories from Database
  let categories: CategoryDB[] = [];
  try {
    const { data: catData, error: catError } = await supabase
      .from("key_term_categories")
      .select("id, name")
      .order("name");

    if (!catError && catData) {
      categories = catData as CategoryDB[];
    }
  } catch {
    // Fallback if table doesn't exist
  }

  // Fetch Templates, Scenes, Loops for binding editor tree
  const { data: templates } = await supabase
    .from("templates")
    .select("id, name")
    .order("name");

  const { data: scenes } = await supabase
    .from("template_scenes")
    .select("id, name, template_id, sequence_number")
    .order("sequence_number");

  const { data: loops } = await supabase
    .from("template_loops")
    .select("id, name, sequence_number, scene_id")
    .order("sequence_number");

  return (
    <KeyTermsEditorClient
      initialKeyTerms={(keyTerms || []) as unknown as KeyTermDB[]}
      initialRelations={(loopKeyTerms || []) as unknown as LoopKeyTermDB[]}
      initialCategories={categories}
      templates={(templates || []) as unknown as TemplateDB[]}
      scenes={(scenes || []) as unknown as SceneDB[]}
      loops={(loops || []) as unknown as LoopDB[]}
    />
  );
}
