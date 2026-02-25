
-- Create storage bucket for seed images
INSERT INTO storage.buckets (id, name, public)
VALUES ('seed-images', 'seed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to seed-images bucket
CREATE POLICY "Users can upload seed images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'seed-images');

-- Allow public read access
CREATE POLICY "Public read access for seed images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'seed-images');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own seed images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'seed-images' AND (storage.foldername(name))[1] = auth.uid()::text);
