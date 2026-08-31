import fs from 'fs'

let content = fs.readFileSync('src/app/admin/reports/supervisors/page.tsx', 'utf8');

// Replace Table Header
content = content.replace(/<thead[\s\S]*?<\/thead>/, `<thead className="bg-[#0A3D8F] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">S.No</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Dept</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Ref No.</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Supervisor Name</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800 min-w-[200px]">Research Area</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Current Scholars</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Slots Available</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>`);

// Replace Table Row
content = content.replace(/<tr key=\{p\.id\}[\s\S]*?<\/tr>/, `<tr key={p.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-slate-700">{p.department}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 font-mono text-xs">{p.ref_no}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-[#0A3D8F] whitespace-normal min-w-[150px]">{p.supervisor_name}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 whitespace-normal min-w-[200px] text-sm">{p.research_area}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-700">{p.current_scholars_count}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-center font-bold text-slate-700">{p.slots_available}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setViewSupervisor(p)} className="text-xs font-bold text-white bg-[#0A3D8F] hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          View More
                        </button>
                      </td>
                    </tr>`);

// Replace Modal Content
const modalRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">[\s\S]*?<\/div>\n            <\/div>/;
const supModal = `<div className="grid grid-cols-1 gap-4 pt-4">
              <div><span className="text-xs font-bold text-slate-400 uppercase">Supervisor Name</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.supervisor_name}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs font-bold text-slate-400 uppercase">Department</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.department}</div></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Ref No.</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.ref_no}</div></div>
              </div>
              <div><span className="text-xs font-bold text-slate-400 uppercase">Research Area</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.research_area}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs font-bold text-slate-400 uppercase">Current Scholars</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.current_scholars_count}</div></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Slots Available</span><div className="font-semibold text-slate-800 mt-1">{viewSupervisor.slots_available}</div></div>
              </div>
            </div>
          </div>`;
content = content.replace(modalRegex, supModal);

fs.writeFileSync('src/app/admin/reports/supervisors/page.tsx', content, 'utf8');

// Scholars
let schContent = fs.readFileSync('src/app/admin/reports/scholars/page.tsx', 'utf8');

schContent = schContent.replace(/<thead[\s\S]*?<\/thead>/, `<thead className="bg-[#0A3D8F] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">S.No</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Research Centre</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Supervisor</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Scholar Name</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">AU Reg. No.</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Year of Reg.</th>
                  <th className="px-4 py-3 font-semibold border-r border-blue-800">Type</th>
                  <th className="px-4 py-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>`);

schContent = schContent.replace(/<tr key=\{p\.id\}[\s\S]*?<\/tr>/, `<tr key={p.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-500 text-center">{idx + 1}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 text-xs">{p.research_centre}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-medium text-slate-700 whitespace-normal min-w-[150px]">{p.supervisor_name}</td>
                      <td className="px-4 py-3 border-r border-slate-100 font-bold text-[#0A3D8F] whitespace-normal min-w-[150px]">{p.scholar_name}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 font-mono text-xs">{p.au_registration_number}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 text-center">{p.year_of_registration ? new Date(p.year_of_registration).getFullYear() : ''}</td>
                      <td className="px-4 py-3 border-r border-slate-100 text-slate-600 text-center font-medium">{p.scholar_type}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => setViewScholar(p)} className="text-xs font-bold text-white bg-[#0A3D8F] hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                          View More
                        </button>
                      </td>
                    </tr>`);

const schModal = `<div className="grid grid-cols-1 gap-4 pt-4">
              <div><span className="text-xs font-bold text-slate-400 uppercase">Scholar Name</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.scholar_name}</div></div>
              <div><span className="text-xs font-bold text-slate-400 uppercase">Supervisor Name</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.supervisor_name}</div></div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs font-bold text-slate-400 uppercase">Research Centre</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.research_centre}</div></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Type</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.scholar_type}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs font-bold text-slate-400 uppercase">AU Reg. No.</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.au_registration_number}</div></div>
                <div><span className="text-xs font-bold text-slate-400 uppercase">Year of Registration</span><div className="font-semibold text-slate-800 mt-1">{viewScholar.year_of_registration ? new Date(viewScholar.year_of_registration).getFullYear() : ''}</div></div>
              </div>
            </div>
          </div>`;
schContent = schContent.replace(modalRegex, schModal);
fs.writeFileSync('src/app/admin/reports/scholars/page.tsx', schContent, 'utf8');

console.log("Updated tables for supervisors and scholars");
