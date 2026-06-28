"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

interface SaveKeyTermInput {
  id: string | null;
  term: string;
  originalWord: string | null;
  meaningOrNote: string | null;
  category: string | null;
}

export async function saveKeyTerm({
  id,
  term,
  originalWord,
  meaningOrNote,
  category,
}: SaveKeyTermInput) {
  const supabase = await createClient();

  if (!term) {
    throw new Error("Nama kata kunci wajib diisi");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Anda harus login terlebih dahulu");
  }

  // Check if user is admin
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    throw new Error("Hanya administrator yang dapat mengelola kata kunci");
  }

  const saveData: Record<string, string | null> = {
    term,
    original_word: originalWord || null,
    meaning_or_note: meaningOrNote || null,
    category: category || null,
  };

  if (id) {
    // Update
    const { data, error } = await supabase
      .from("key_terms")
      .update(saveData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui kata kunci: ${error.message}`);
    }

    revalidatePath("/templates/keyterms");
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from("key_terms")
      .insert(saveData)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal membuat kata kunci: ${error.message}`);
    }

    revalidatePath("/templates/keyterms");
    return data;
  }
}

export async function deleteKeyTerm(id: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Anda harus login terlebih dahulu");
  }

  // Check if user is admin
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    throw new Error("Hanya administrator yang dapat menghapus kata kunci");
  }

  // 1. Delete relations from loop_key_terms first
  const { error: relError } = await supabase
    .from("loop_key_terms")
    .delete()
    .eq("key_term_id", id);

  if (relError) {
    throw new Error(`Gagal menghapus relasi kata kunci: ${relError.message}`);
  }

  // 2. Delete translations
  const { error: transError } = await supabase
    .from("project_key_term_translations")
    .delete()
    .eq("key_term_id", id);

  if (transError) {
    throw new Error(`Gagal menghapus terjemahan kata kunci: ${transError.message}`);
  }

  // 3. Delete the key term itself
  const { error: termError } = await supabase
    .from("key_terms")
    .delete()
    .eq("id", id);

  if (termError) {
    throw new Error(`Gagal menghapus kata kunci: ${termError.message}`);
  }

  revalidatePath("/templates/keyterms");
  return { success: true };
}

export async function updateKeyTermLoopRelations(termId: string, loopIds: string[]) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Anda harus login terlebih dahulu");
  }

  // Check if user is admin
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    throw new Error("Hanya administrator yang dapat mengelola hubungan loop");
  }

  // 1. Delete all existing relations for this key term
  const { error: deleteError } = await supabase
    .from("loop_key_terms")
    .delete()
    .eq("key_term_id", termId);

  if (deleteError) {
    throw new Error(`Gagal membersihkan hubungan loop lama: ${deleteError.message}`);
  }

  // 2. Insert new relations in bulk
  if (loopIds.length > 0) {
    const insertRows = loopIds.map(loopId => ({
      key_term_id: termId,
      template_loop_id: loopId,
    }));

    const { error: insertError } = await supabase
      .from("loop_key_terms")
      .insert(insertRows);

    if (insertError) {
      throw new Error(`Gagal menyimpan hubungan loop baru: ${insertError.message}`);
    }
  }

  revalidatePath("/templates/keyterms");
  return { success: true };
}

export async function saveCategory(id: string | null, name: string) {
  const supabase = await createClient();

  if (!name || !name.trim()) {
    throw new Error("Nama kategori wajib diisi");
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Anda harus login terlebih dahulu");
  }

  // Check if user is admin
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    throw new Error("Hanya administrator yang dapat mengelola kategori");
  }

  const formattedName = name.trim();

  if (id) {
    // Fetch old category name first to update referencing key terms
    const { data: oldCategoryData } = await supabase
      .from("key_term_categories")
      .select("name")
      .eq("id", id)
      .single();

    // Update category name
    const { data, error } = await supabase
      .from("key_term_categories")
      .update({ name: formattedName })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal memperbarui kategori: ${error.message}`);
    }

    // Update categories in key_terms if old category name was found
    if (oldCategoryData?.name) {
      await supabase
        .from("key_terms")
        .update({ category: formattedName })
        .eq("category", oldCategoryData.name);
    }

    revalidatePath("/templates/keyterms");
    return data;
  } else {
    // Insert new category
    const { data, error } = await supabase
      .from("key_term_categories")
      .insert({ name: formattedName })
      .select()
      .single();

    if (error) {
      throw new Error(`Gagal membuat kategori baru: ${error.message}`);
    }

    revalidatePath("/templates/keyterms");
    return data;
  }
}

export async function deleteCategory(id: string, name: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Anda harus login terlebih dahulu");
  }

  // Check if user is admin
  const { data: dbUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isEvan = user.email?.toLowerCase() === "evan@osdindonesia.com";
  const isAdmin = dbUser?.role === "admin" || isEvan;

  if (!isAdmin) {
    throw new Error("Hanya administrator yang dapat menghapus kategori");
  }

  // 1. Delete category from key_term_categories
  const { error } = await supabase
    .from("key_term_categories")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Gagal menghapus kategori: ${error.message}`);
  }

  // 2. Set category of referencing key terms to null
  await supabase
    .from("key_terms")
    .update({ category: null })
    .eq("category", name);

  revalidatePath("/templates/keyterms");
  return { success: true };
}
