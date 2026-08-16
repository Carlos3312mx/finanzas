using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Program
{
    [STAThread]
    static void Main()
    {
        string currentDir = AppDomain.CurrentDomain.BaseDirectory;
        string localPath = Path.Combine(currentDir, "index.html");

        // Si no existe al lado del exe, buscar en la ruta de desarrollo por defecto
        if (!File.Exists(localPath))
        {
            localPath = @"C:\Users\Carlos\.gemini\antigravity\scratch\financial-projection-dashboard\index.html";
        }

        if (!File.Exists(localPath))
        {
            MessageBox.Show(
                "No se pudo encontrar el archivo index.html del Dashboard.\n\nPor favor coloca este ejecutable en la carpeta del proyecto.",
                "Error de Lanzador",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
            return;
        }

        ProcessStartInfo startInfo = new ProcessStartInfo();
        startInfo.FileName = "msedge.exe";
        startInfo.Arguments = "--app=\"file:///" + localPath.Replace('\\', '/') + "\"";
        startInfo.UseShellExecute = true;

        try
        {
            Process.Start(startInfo);
        }
        catch (Exception)
        {
            // Intentar con Chrome si Edge no responde o no está disponible
            startInfo.FileName = "chrome.exe";
            try
            {
                Process.Start(startInfo);
            }
            catch (Exception)
            {
                // Si ambos fallan, abrir en el navegador web predeterminado normalmente
                try
                {
                    Process.Start("file:///" + localPath.Replace('\\', '/'));
                }
                catch (Exception ex) {
                    MessageBox.Show(
                        "No se pudo abrir el dashboard en ningún navegador.\nDetalles: " + ex.Message,
                        "Error al Abrir",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                }
            }
        }
    }
}
