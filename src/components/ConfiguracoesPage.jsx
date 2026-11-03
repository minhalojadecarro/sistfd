import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ConfiguracoesPage() {
  const [complexImage, setComplexImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchComplexImage();
  }, []);

  async function fetchComplexImage() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'home_complex_image')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data && data.value) {
        setComplexImage(data.value);
      }
    } catch (error) {
      console.error('Erro ao carregar a foto do complexo:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(event) {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `complexo_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Faz o upload para o bucket 'public-assets'
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obtém a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      // 3. Guarda/Atualiza na tabela site_settings
      const { error: dbError } = await supabase
        .from('site_settings')
        .upsert({ key: 'home_complex_image', value: publicUrl }, { onConflict: 'key' });

      if (dbError) throw dbError;

      setComplexImage(publicUrl);
      alert('Foto do complexo atualizada com sucesso!');
    } catch (error) {
      alert('Erro ao carregar a imagem: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ 
        background: '#fff', 
        padding: '30px', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ color: '#0056b3', marginTop: '0' }}>Configurações do Sistema</h2>
        <p style={{ fontSize: '15px', color: '#495057', marginBottom: '25px' }}>
          Gerencie elementos visuais e parâmetros gerais da plataforma SistFD.
        </p>

        <div style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h3 style={{ fontSize: '18px', color: '#333', marginBottom: '10px' }}>Foto do Complexo (Página Inicial)</h3>
          <p style={{ fontSize: '14px', color: '#6c757d', marginBottom: '15px' }}>
            Esta imagem será exibida em destaque na página inicial (Home) do sistema.
          </p>

          {loading ? (
            <p style={{ color: '#6c757d' }}>A carregar imagem atual...</p>
          ) : (
            <div style={{ marginBottom: '10px' }}>
              {complexImage ? (
                <div style={{ marginBottom: '8px', textAlign: 'center' }}>
                  <img 
                    src={complexImage} 
                    alt="Complexo TFD Atual" 
                    style={{ 
                      maxWidth: '50%', 
                      height: '90px', 
                      width: 'auto', 
                      objectFit: 'cover', 
                      borderRadius: '3px', 
                      border: '1px solid #ccc',
                      display: 'inline-block' 
                    }} 
                  />
                </div>
              ) : (
                <p style={{ fontSize: '14px', fontStyle: 'italic', color: '#888', marginBottom: '15px' }}>
                  Nenhuma foto definida atualmente.
                </p>
              )}

              <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '6px', border: '1px dashed #0056b3' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', color: '#0056b3', marginBottom: '8px' }}>
                  {complexImage ? 'Substituir foto do complexo:' : 'Enviar nova foto do complexo:'}
                </label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  disabled={uploading}
                  style={{ fontSize: '14px' }}
                />
                {uploading && <p style={{ fontSize: '13px', color: '#0056b3', marginTop: '5px' }}>A enviar imagem para o servidor...</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}