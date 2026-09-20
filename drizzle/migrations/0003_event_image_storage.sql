INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-images',
  'event-images',
  true,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "event images staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'event-images' AND public.is_staff((SELECT auth.uid())));

CREATE POLICY "event images staff insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      public.has_role((SELECT auth.uid()), 'administrateur')
      OR public.has_role((SELECT auth.uid()), 'editeur')
    )
  );

CREATE POLICY "event images staff update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'event-images'
    AND (
      public.has_role((SELECT auth.uid()), 'administrateur')
      OR public.has_role((SELECT auth.uid()), 'editeur')
    )
  )
  WITH CHECK (
    bucket_id = 'event-images'
    AND (
      public.has_role((SELECT auth.uid()), 'administrateur')
      OR public.has_role((SELECT auth.uid()), 'editeur')
    )
  );

CREATE POLICY "event images admin delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-images' AND public.has_role((SELECT auth.uid()), 'administrateur'));
