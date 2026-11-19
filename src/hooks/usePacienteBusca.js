import { useState, useEffect, useCallback } from 'react';
import { pesquisarPacientes, buscarPacienteCompletoPorId } from '../services/pacienteService';

export function usePacienteBusca({ onSelecionarPaciente }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [carregandoBusca, setCarregandoBusca] = useState(false);

  const abrirPesquisa = useCallback(() => {
    setTermoPesquisa('');
    setResultadosBusca([]);
    setIsSearchOpen(true);
  }, []);

  const fecharPesquisa = useCallback(() => {
    setIsSearchOpen(false);
    setTermoPesquisa('');
    setResultadosBusca([]);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;

    const termoLimpo = termoPesquisa.trim();
    if (termoLimpo.length < 2) {
      setResultadosBusca([]);
      setCarregandoBusca(false);
      return;
    }

    let ativo = true;
    const timer = setTimeout(async () => {
      try {
        setCarregandoBusca(true);
        const lista = await pesquisarPacientes(termoLimpo);
        if (ativo) {
          setResultadosBusca(lista);
        }
      } catch {
        if (ativo) {
          setResultadosBusca([]);
        }
      } finally {
        if (ativo) {
          setCarregandoBusca(false);
        }
      }
    }, 300);

    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [termoPesquisa, isSearchOpen]);

  const confirmarSelecao = useCallback(
    async (pacienteBasico) => {
      if (!pacienteBasico?.id) return;

      try {
        setCarregandoBusca(true);
        const pacienteCompleto = await buscarPacienteCompletoPorId(pacienteBasico.id);
        fecharPesquisa();
        if (onSelecionarPaciente && pacienteCompleto) {
          onSelecionarPaciente(pacienteCompleto);
        }
      } catch (err) {
        console.error('Erro ao carregar dados completos do paciente selecionado:', err);
      } finally {
        setCarregandoBusca(false);
      }
    },
    [fecharPesquisa, onSelecionarPaciente]
  );

  return {
    isSearchOpen,
    setIsSearchOpen,
    termoPesquisa,
    setTermoPesquisa,
    resultadosBusca,
    carregandoBusca,
    abrirPesquisa,
    fecharPesquisa,
    confirmarSelecao,
  };
}