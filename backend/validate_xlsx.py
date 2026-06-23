import zipfile
import xml.etree.ElementTree as ET

def validate_xlsx(filepath):
    print(f"Validating file: {filepath}")
    try:
        with zipfile.ZipFile(filepath, "r") as z:
            bad_file = z.testzip()
            if bad_file:
                print(f"Zipfile test failed: first corrupt file inside zip is {bad_file}")
                return False
            print("Zip structure is valid.")
            
            # Print files inside
            namelist = z.namelist()
            print(f"Number of files in zip: {len(namelist)}")
            
            # Let's check the main workbook XMLs
            for name in namelist:
                if name.endswith(".xml") or name.endswith(".rels"):
                    try:
                        content = z.read(name)
                        ET.fromstring(content)
                    except Exception as e:
                        print(f"XML parsing error in file {name}: {e}")
                        return False
            print("All XML files inside the zip are syntactically valid.")
            return True
    except Exception as e:
        print(f"Failed to open zipfile: {e}")
        return False

if __name__ == "__main__":
    validate_xlsx("test_excel_output.xlsx")
