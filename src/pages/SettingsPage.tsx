import { useState, useRef } from 'react';
import {
  Moon,
  Sun,
  Download,
  Upload,
  Smartphone,
  DollarSign,
  Check,
} from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettings } from '@/hooks/useSettings';
import { exportAllData, importAllData } from '@/lib/storage';
import { toast } from '@/hooks/use-toast';

const CURRENCIES = [
  { code: 'BRL', symbol: 'R$', name: 'Real Brasileiro' },
  { code: 'USD', symbol: '$', name: 'Dólar Americano' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
];

export default function SettingsPage() {
  const { settings, updateSettings, toggleTheme } = useSettings();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financas-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Backup exportado com sucesso!' });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      await importAllData(text);
      toast({ title: 'Dados importados com sucesso!' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Erro ao importar arquivo', variant: 'destructive' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCurrencyChange = (code: string) => {
    const currency = CURRENCIES.find(c => c.code === code);
    if (currency) {
      updateSettings({
        currency: currency.code,
        currencySymbol: currency.symbol,
      });
    }
  };

  return (
    <PageContainer
      header={<h1 className="text-2xl font-bold">Configurações</h1>}
    >
      <div className="space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Aparência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.theme === 'dark' ? (
                  <Moon className="h-5 w-5 text-primary" />
                ) : (
                  <Sun className="h-5 w-5 text-warning" />
                )}
                <Label htmlFor="theme">Tema Escuro</Label>
              </div>
              <Switch
                id="theme"
                checked={settings.theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Moeda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <Select
                value={settings.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* PWA Install */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Instalar App</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-3">
                  Instale o FinançasPRO no seu celular para acesso rápido e uso
                  offline. No navegador, toque em "Compartilhar" e depois em
                  "Adicionar à Tela Inicial".
                </p>
                <div className="flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" />
                  <span>App funciona 100% offline</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exportando...' : 'Exportar Backup (JSON)'}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* App Info */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>FinançasPRO v1.0</p>
          <p>Seus dados ficam salvos localmente no dispositivo</p>
        </div>
      </div>
    </PageContainer>
  );
}
