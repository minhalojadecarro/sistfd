import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Ajuste o caminho relativo se necessário (ex: '../supabaseClient' ou '../../supabaseClient')


// Inicialize o cliente do Supabase (substitua pelas suas variáveis de ambiente ou chaves)
const supabaseUrl = 'O_SEU_SUPABASE_URL';
const supabaseKey = 'O_SEU_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminHomeImageManager() {
  const [uploading, setUploading] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [message, setMessage] = useState('');

  // 1. Carregar a imagem atual guardada na base de dados ao abrir a página
  useEffect(() => {
    fetchCurrentImage();
  }, []);

  async function fetchCurrentImage() {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'home_complex_image')
        .single();

      if (error) throw error;
      if (data && data.value) {
        setCurrentImage(data.value);
      }
    } catch (error) {
      console.error('Erro ao carregar a imagem atual:', error.message);
    }
  }

  // 2. Lidar com a seleção do ficheiro e gerar pré-visualização
  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  // 3. Enviar a imagem para o Storage e atualizar a tabela
  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) {
      setMessage('Por favor, selecione uma imagem primeiro.');
      return;
    }

    try {
      setUploading(true);
      setMessage('');

      // Criar um nome de ficheiro único para evitar conflitos
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `complex_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Fazer upload para o bucket 'public-assets'
      const { error: uploadError } = await supabase.storage
        .from('public-assets')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Obter a URL pública do ficheiro enviado
      const { data: publicUrlData } = supabase.storage
        .from('public-assets')
        .getPublicUrl(filePath);

      const newImageUrl = publicUrlData.publicUrl;

      // Atualizar o link na tabela site_settings
      const { error: updateError } = await supabase
        .from('site_settings')
        .update({ value: newImageUrl })
        .eq('key', 'home_complex_image');

      if (updateError) throw updateError;

      setCurrentImage(newImageUrl);
      setSelectedFile(null);
      setPreview('');
      setMessage('Foto do complexo atualizada com sucesso!');
    } catch (error) {
      console.error('Erro no upload:', error.message);
      setMessage('Erro ao atualizar a foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <h2>Gerir Foto do Complexo (Home)</h2>

      {message && <div style={{ marginBottom: '15px', padding: '10px', background: '#e2e8f0' }}>{message}</div>}

      <div style={{ marginBottom: '20px' }}>
        <h3>Imagem Atual:</h3>
        {currentImage ? (
          <img src={currentImage} alt="Complexo TFD Atual" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '8px' }} />
        ) : (
          <p>Nenhuma imagem definida atualmente.</p>
        )}
      </div>

      <form onSubmit={handleUpload}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Escolher nova foto do complexo:</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        {preview && (
          <div style={{ marginBottom: '15px' }}>
            <h4>Pré-visualização da nova imagem:</h4>
            <img src={preview} alt="Pré-visualização" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px' }} />
          </div>
        )}

        <button 
          type="submit" 
          disabled={uploading || !selectedFile}
          style={{ padding: '10px 20px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {uploading ? 'A enviar...' : 'Guardar Alteração'}
        </button>
      </form>
    </div>
  );
}