import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

function validateBasicAuth(authHeader: string | null): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }

  try {
    const base64Credentials = authHeader.substring(6);
    const credentials = atob(base64Credentials);
    const [username, password] = credentials.split(':');
    
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
  } catch (error) {
    console.error('Error validating Basic Auth:', error);
    return false;
  }
}

function sanitizeInput(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

function createAuditLog(
  supabase: any,
  action: string,
  taskId: number | null,
  updatedContent: any
) {
  return supabase
    .from('audit_logs')
    .insert({
      action,
      task_id: taskId,
      updated_content: updatedContent,
      timestamp: new Date().toISOString()
    });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!validateBasicAuth(authHeader)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized access. Please provide valid credentials.' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    const apiIndex = pathParts.indexOf('api');
    if (apiIndex !== -1) {
      pathParts.splice(apiIndex, 1);
    }

    console.log('Request:', req.method, pathParts);

    if (req.method === 'GET' && pathParts[0] === 'tasks') {
      const search = url.searchParams.get('search') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '5');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('tasks')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching tasks:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch tasks' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          tasks: data, 
          total: count,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST' && pathParts[0] === 'tasks') {
      const body = await req.json();
      const title = sanitizeInput(body.title || '');
      const description = sanitizeInput(body.description || '');

      if (!title || title.length === 0 || title.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Title must be between 1 and 100 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!description || description.length === 0 || description.length > 500) {
        return new Response(
          JSON.stringify({ error: 'Description must be between 1 and 500 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({ title, description })
        .select()
        .single();

      if (error) {
        console.error('Error creating task:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create task' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(supabase, 'Create Task', data.id, { title, description });

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'PUT' && pathParts[0] === 'tasks' && pathParts[1]) {
      const taskId = parseInt(pathParts[1]);
      const body = await req.json();
      
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (!currentTask) {
        return new Response(
          JSON.stringify({ error: 'Task not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const updates: any = {};
      const changedFields: any = {};

      if (body.title !== undefined) {
        const title = sanitizeInput(body.title);
        if (!title || title.length === 0 || title.length > 100) {
          return new Response(
            JSON.stringify({ error: 'Title must be between 1 and 100 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (title !== currentTask.title) {
          updates.title = title;
          changedFields.title = title;
        }
      }

      if (body.description !== undefined) {
        const description = sanitizeInput(body.description);
        if (!description || description.length === 0 || description.length > 500) {
          return new Response(
            JSON.stringify({ error: 'Description must be between 1 and 500 characters' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (description !== currentTask.description) {
          updates.description = description;
          changedFields.description = description;
        }
      }

      if (Object.keys(updates).length === 0) {
        return new Response(
          JSON.stringify(currentTask),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update task' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(supabase, 'Update Task', taskId, changedFields);

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE' && pathParts[0] === 'tasks' && pathParts[1]) {
      const taskId = parseInt(pathParts[1]);

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Error deleting task:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to delete task' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await createAuditLog(supabase, 'Delete Task', taskId, null);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET' && pathParts[0] === 'logs') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '5');
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error fetching logs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch logs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          logs: data, 
          total: count,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});