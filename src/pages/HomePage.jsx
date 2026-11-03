import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function HomePage() {
  const [complexImage, setComplexImage] = useState('');
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ 
        background: '#f8f9fa', 
        padding: '30px', 
        borderRadius: '8px', 
        border: '1px solid #dee2e6',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{ color: '#0056b3', marginTop: '0' }}>Bem-vindo ao Sistema de Gestão de Tratamento Fora de Domicílio - SisTFD</h2>
        <p style={{ fontSize: '16px', color: '#495057', lineHeight: '1.5', marginBottom: '20px' }}>
          Plataforma dedicada a otimizar a logística e o atendimento aos pacientes do Estado do Amazonas. 
        </p>

        {/* Exibição da Foto do Complexo */}
        <div style={{ margin: '20px 0', textAlign: 'center' }}>
          {loading ? (
            <p style={{ color: '#6c757d' }}>A carregar imagem do complexo...</p>
          ) : complexImage ? (
            <div style={{ borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', maxHeight: '400px' }}>
              <img 
                src={complexImage} 
                alt="Complexo TFD" 
                style={{ width: '100%', height: 'auto', maxHeight: '400px', objectFit: 'cover', display: 'block' }} 
              />
            </div>
          ) : (
            <p style={{ fontSize: '14px', color: '#6c757d', fontStyle: 'italic' }}>
              Nenhuma foto do complexo configurada. Utilize o painel de Configurações para carregar uma imagem.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}