import pdfplumber
import json
import sys

def parse_pdf_tables(pdf_path, output_json):
    agencies = []
    current_section = 'National'
    
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean up each cell
                    cleaned_row = [str(cell).strip().replace('\n', ' ') if cell is not None else '' for cell in row]
                    
                    if not cleaned_row:
                        continue
                        
                    s_no_str = cleaned_row[0]
                    
                    if s_no_str.upper() == 'INTERNATIONAL':
                        current_section = 'International'
                        continue
                    if s_no_str.upper() == 'NATIONAL':
                        current_section = 'National'
                        continue
                        
                    if not s_no_str.isdigit():
                        continue
                        
                    s_no = int(s_no_str)
                    
                    if len(cleaned_row) >= 4:
                        agency_name = cleaned_row[1]
                        website = cleaned_row[2].replace(' ', '')
                        contact = cleaned_row[3]
                        
                        agencies.append({
                            's_no': s_no,
                            'section': current_section,
                            'agency_name': agency_name,
                            'website': website,
                            'contact_details': contact
                        })
                        
    # Manually fix known split if pdfplumber misses 'INTERNATIONAL' header row
    # The user noted that 'International Foundation for Science (IFS)' is S.No 143, but wait
    # The prompt actually lists IFS as S.No 143 in the International section, and earlier as S.No 64.
    # Let's see what we actually extracted first.
    with open(output_json, 'w') as f:
        json.dump(agencies, f, indent=2)

if __name__ == '__main__':
    parse_pdf_tables(sys.argv[1], sys.argv[2])
