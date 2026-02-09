using System;
using System.Text.RegularExpressions;

namespace IoCManagerProject
{
    public class IOC
    {
        public int IocID { get; set; }
        public string Value { get; set; }
        public string Type { get; set; }
        public string Severity { get; set; }
        public string Source { get; set; }
        public DateTime CreatedAt { get; set; }

        public IOC(int id, string value, string type, string severity, string source)
        {
            IocID = id;
            Value = value;
            Type = type.ToUpper();
            Severity = severity;
            Source = source;
            CreatedAt = DateTime.Now;
        }

        public bool ValidateIOC()
        {
            Console.WriteLine($"[VALIDATING]: Checking {Type} format for value: {Value}");
            bool isValid = false;

            switch (Type)
            {
                case "IP ADDRESS":
                    string ipPattern = @"^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$";
                    isValid = Regex.IsMatch(Value, ipPattern);
                    break;

                case "DOMAIN NAME":
                    // Validates standard domain format (e.g., example.com)
                    string domainPattern = @"^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$";
                    isValid = Regex.IsMatch(Value.ToLower(), domainPattern);
                    break;

                case "URL":
                    // Validates web links
                    isValid = Uri.TryCreate(Value, UriKind.Absolute, out _);
                    break;

                case "FILE HASH":
                    // MD5 (32) or SHA256 (64) characters
                    isValid = Value.Length == 32 || Value.Length == 64;
                    break;

                case "TRAFFIC PATTERN":
                case "LOG EVENT":
                case "PROCESS / ARTIFACT":
                    // These are often complex strings or rules (like YARA/Sigma)
                    // For now, we ensure they are not empty
                    isValid = !string.IsNullOrEmpty(Value);
                    break;

                default:
                    isValid = false;
                    break;
            }

            DisplayValidationResult(isValid);
            return isValid;
        }

        private void DisplayValidationResult(bool isValid)
        {
            if (isValid)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[SUCCESS]: {Type} is valid.");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[FAILED]: {Type} format is incorrect!");
            }
            Console.ResetColor();
        }

        // Returns the specific type of the IoC for classification
        public string GetIOCType()
        {
            Console.WriteLine($"[INFO]: Retrieving type for IoC ID {IocID}: {Type}");
            return this.Type;
        }

        // Retrieves detailed information about the specific IoC
        public string GetDetails()
        {
            string details = $"IoC ID: {IocID} | Type: {Type} | Value: {Value} | Severity: {Severity} | Source: {Source}";
            Console.WriteLine($"[DEBUG]: Fetching details for ID {IocID}...");
            return details;
        }

        // Checks if a specific input (like a log entry) matches this IoC
        public bool Match(string input)
        {
            // StringComparison.OrdinalIgnoreCase ensures 'MALWARE.EXE' matches 'malware.exe'
            bool isMatch = Value.Equals(input, StringComparison.OrdinalIgnoreCase);

            if (isMatch)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[ALERT]: Match detected! Input '{input}' matches IoC {IocID}");
                Console.ResetColor();
            }

            return isMatch;
        }

        // Updates the IoC record with new data and returns the updated object
        public IOC UpdateIOC(string newData)
        {
            Console.WriteLine($"[UPDATE]: Changing value of IoC {IocID} from '{Value}' to '{newData}'");

            this.Value = newData;

            this.CreatedAt = DateTime.Now;

            return this;
        }


    }
}