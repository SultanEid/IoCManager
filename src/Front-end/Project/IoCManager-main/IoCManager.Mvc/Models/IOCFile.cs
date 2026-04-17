using System;
using System.Collections.Generic;
using System.IO;
using IoCManagerProject;



namespace IoCManager.Mvc.Models
{
    public class IOCFile
    {
        // Properties from the Class Diagram
        public string FileName;
        public string FilePath;
        public long Size;
        public string FileType;
        public DateTime ImportedAt;
        public bool FormatValid;

        // Constructor
        public IOCFile(string path)
        {
            FilePath = path;
            FileName = Path.GetFileName(path);
            FileType = Path.GetExtension(path);
            ImportedAt = DateTime.Now;

            // Check if file exists to get the size
            if (File.Exists(path))
            {
                Size = new FileInfo(path).Length;
                FormatValid  = ValidateFormat();
            }

            Console.WriteLine($"[FILE SYSTEM]: New IOCFile linked: {FileName}");
        }

        public void ParseFile()
        {
            Console.WriteLine($"[PARSING]: Starting to parse '{FileName}'...");

            if (!File.Exists(FilePath))
            {
                Console.WriteLine("[ERROR]: File not found. Parsing aborted.");
                return;
            }

            try
            {
                // We read the headers to ensure the CSV has the required columns
                using (StreamReader reader = new StreamReader(FilePath))
                {
                    string headerLine = reader.ReadLine();
                    if (headerLine != null && headerLine.Contains("Value") && headerLine.Contains("Type"))
                    {
                        Console.WriteLine("[SUCCESS]: File structure parsed. Required headers found.");
                    }
                    else
                    {
                        Console.WriteLine("[WARNING]: File structure might be incorrect. Missing standard headers.");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL]: Error while parsing file content: {ex.Message}");
            }
        }

        // +validateFormat(): bool
        // Checks if the file extension is supported (e.g., .csv or .json)
        public bool ValidateFormat()
        {
            Console.WriteLine($"[CHECK]: Validating format for {FileName}...");

            // Simple validation: only CSV for now
            FormatValid = FileType.ToLower() == ".csv";

            if (FormatValid)
                Console.WriteLine("[RESULT]: Format is valid ✅");
            else
                Console.WriteLine("[RESULT]: Invalid format! System only supports .csv ❌");

            return FormatValid;
        }

        // +getFileMetadata(): String
        // Returns a summary of the file information
        public string GetFileMetadata()
        {
            return $"File: {FileName} | Type: {FileType} | Size: {Size} bytes | Imported: {ImportedAt}";
        }

        // +parseFile() & +importIOC()
        // Reads the file content and converts it into IOC objects
        public List<IOC> ImportIOC()
        {
            List<IOC> iocList = new List<IOC>();

            // FIX 1: Check format first
            if (!FormatValid) return iocList;

            try
            {
                string[] lines = File.ReadAllLines(FilePath);
                for (int i = 1; i < lines.Length; i++)
                {
                    string[] data = lines[i].Split(',');

                    // FIX 2: Better validation of row data
                    if (data.Length >= 5 && int.TryParse(data[0], out int id))
                    {
                        iocList.Add(new IOC(id, data[1], data[2], data[3], data[4]));
                    }
                    else
                    {
                        Console.WriteLine($"[SKIP]: Row {i + 1} is malformed.");
                    }
                }
            }
            catch (Exception ex) { /* Log error */ }

            return iocList;
        }

        // +exportIOC()
        // Simulates exporting IOCs back to a file or database
        public void ExportIOC()
        {
            Console.WriteLine($"[EXPORT]: Exporting data related to {FileName} to the central database...");
        }
    }
}