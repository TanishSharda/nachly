import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface WizardPreset {
  title: string;
  description: string;
  styleSlug: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  lessonCount: number;
  accessType: 'free' | 'ppv' | 'subscription';
  audience?: string;
}

/**
 * GET /api/choreographer/wizard-preset
 * Retrieve the current user's saved wizard preset
 */
export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('creator_wizard_presets')
      .select('*')
      .eq('choreographer_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error?.code === 'PGRST116') {
      // No row found
      return NextResponse.json({ preset: null }, { status: 200 });
    }

    if (error) {
      console.error('Error fetching wizard preset:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      preset: {
        id: data.id,
        title: data.title,
        description: data.description,
        styleSlug: data.style_slug,
        difficulty: data.difficulty,
        lessonCount: data.lesson_count,
        accessType: data.access_type,
        audience: data.audience,
        updatedAt: data.updated_at,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/choreographer/wizard-preset:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/choreographer/wizard-preset
 * Create or update the user's wizard preset
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: WizardPreset = await request.json();

    // Validate required fields
    if (!body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Try to upsert
    const { data, error } = await supabase
      .from('creator_wizard_presets')
      .upsert(
        {
          choreographer_id: user.id,
          title: body.title.trim(),
          description: body.description.trim(),
          style_slug: body.styleSlug,
          difficulty: body.difficulty,
          lesson_count: body.lessonCount,
          access_type: body.accessType,
          audience: body.audience?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'choreographer_id',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving wizard preset:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        preset: {
          id: data.id,
          title: data.title,
          description: data.description,
          styleSlug: data.style_slug,
          difficulty: data.difficulty,
          lessonCount: data.lesson_count,
          accessType: data.access_type,
          audience: data.audience,
          updatedAt: data.updated_at,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error in POST /api/choreographer/wizard-preset:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/choreographer/wizard-preset
 * Clear the user's wizard preset
 */
export async function DELETE() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('creator_wizard_presets')
      .delete()
      .eq('choreographer_id', user.id);

    if (error) {
      console.error('Error deleting wizard preset:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error in DELETE /api/choreographer/wizard-preset:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
