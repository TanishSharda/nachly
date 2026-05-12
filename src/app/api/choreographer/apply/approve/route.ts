import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sendApplicationEmail } from '@/lib/fallbacks/email';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/choreographer/apply/approve
 * 
 * Admin endpoint to approve or reject choreographer applications.
 * Requires authentication and admin role.
 * 
 * Body: {
 *   applicationId: string (UUID)
 *   decision: 'approve' | 'reject'
 *   reason?: string (rejection reason)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabase();
    
    // Check authentication
    const { data: { user } = { user: null } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, decision, reason } = body;

    if (!applicationId || !decision) {
      return NextResponse.json({ error: 'Missing applicationId or decision' }, { status: 400 });
    }

    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    // Use service role to update application status
    const db = process.env.SUPABASE_SERVICE_ROLE_KEY ? createServiceRoleClient() : supabase;

    // Fetch the application to get user details
    const { data: application, error: fetchError } = await db
      .from('choreographer_applications')
      .select('id,user_id,experience,specialties')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Update application status
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';
    const { error: updateError } = await db
      .from('choreographer_applications')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('Error updating application status:', updateError);
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 });
    }

    // If approved, update user profile role to 'choreographer'
    if (decision === 'approve') {
      const { error: profileError } = await db
        .from('profiles')
        .update({ role: 'choreographer' })
        .eq('id', application.user_id);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
        // Don't fail the request, just log it
      }
    }

    // Get user email for notification
    let userEmail = '';
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(application.user_id);
      userEmail = authUser?.user?.email || '';
    } catch (err) {
      console.error('Error fetching user email:', err);
    }

    // Send notification email
    if (userEmail) {
      try {
        const emailSubject = decision === 'approve'
          ? 'Congratulations! Your Choreographer Application is Approved 🎉'
          : 'Your Choreographer Application Status Update';

        const emailHtml = decision === 'approve'
          ? `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #c4ff00;">🎉 Congratulations!</h2>
              <p>Your choreographer application has been <strong>approved</strong>!</p>
              <p>You now have access to the creator dashboard where you can:</p>
              <ul>
                <li>Upload and manage your choreographies</li>
                <li>Track analytics and engagement</li>
                <li>Earn from your content</li>
                <li>Connect with students</li>
              </ul>
              <p><a href="https://nachly.in/choreographer" style="background-color: #c4ff00; color: #0a0a0a; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Go to Creator Dashboard
              </a></p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #999;">If you have questions, reach out to our support team.</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2>Application Status Update</h2>
              <p>Thank you for your interest in becoming a choreographer on Nachly.</p>
              <p>Unfortunately, your application was <strong>not approved</strong> at this time.</p>
              ${reason ? `<p><strong>Feedback:</strong> ${reason}</p>` : ''}
              <p>We encourage you to refine your portfolio and reapply. Feel free to reach out if you have any questions.</p>
              <p><a href="https://nachly.in/apply-choreographer" style="color: #c4ff00; text-decoration: none;">
                Reapply
              </a></p>
            </div>
          `;

        await sendApplicationEmail({
          smtpHost: process.env.SMTP_HOST,
          smtpPort: process.env.SMTP_PORT,
          smtpUser: process.env.SMTP_USER,
          smtpPass: process.env.SMTP_PASS,
          from: process.env.CHOREO_APPS_NOTIFY_EMAIL,
          to: userEmail,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (emailError) {
        console.error('Error sending notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${newStatus}`,
      applicationId,
      decision,
    });
  } catch (error) {
    console.error('Error in approve endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
