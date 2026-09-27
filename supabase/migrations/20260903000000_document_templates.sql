CREATE TABLE IF NOT EXISTS public.document_templates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    module text NOT NULL,
    doc_key text NOT NULL,
    doc_label text NOT NULL,
    version_label text NOT NULL,
    file_url text NOT NULL,
    is_current boolean NOT NULL DEFAULT true,
    uploaded_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT document_templates_pkey PRIMARY KEY (id)
);

ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users (staff, admins)
CREATE POLICY "Authenticated users can view templates" 
    ON public.document_templates 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Admin routes use the service_role key to bypass RLS.
-- We do not allow any direct client-side modification.
CREATE POLICY "Disable direct insert" 
    ON public.document_templates 
    FOR INSERT 
    WITH CHECK (false);

CREATE POLICY "Disable direct update" 
    ON public.document_templates 
    FOR UPDATE 
    USING (false);

CREATE POLICY "Disable direct delete" 
    ON public.document_templates 
    FOR DELETE 
    USING (false);
