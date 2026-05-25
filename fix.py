import sys

filepath = r'c:\Users\nguye\OneDrive\AI\REPORT\weekly-report-web\src\components\DrawingRegisterView.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

broken_str = """                              {revVal}
                </div>
              </div>
              <button 
                onClick={() => setShowOneDriveModal(false)}
                className={`p-1.5 rounded-lg hover:bg-slate-800/20 transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Folder structure and list would go here */}
            </div>
          </div>
        </div>
      )}"""

fixed_str = """                              {revVal}
                            </span>
                          ) : (
                            <span className={`text-[10px] ${isDark ? 'text-slate-700' : 'text-slate-300'}`}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className={`p-4 border-t flex items-center justify-between text-xs font-bold ${
        isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'
      }`}>
        <div className="flex items-center gap-2">
          <Info size={14} className="text-indigo-500" />
          <span>Tổng số bản vẽ: {filteredDrawings.length} / {registerData.drawings.length}</span>
        </div>
      </div>

      {/* OneDrive Explorer Modal Dialog */}
      {showOneDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowOneDriveModal(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className={`relative w-full max-w-4xl h-[620px] rounded-3xl shadow-2xl overflow-hidden flex flex-col border ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <Cloud className="text-indigo-500" size={24} />
                <div>
                  <h3 className="font-black text-base flex items-center gap-2">
                    OneDrive Cloud Explorer
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setShowOneDriveModal(false)}
                className={`p-1.5 rounded-lg hover:bg-slate-800/20 transition-all ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {/* Folder structure and list would go here */}
            </div>
          </div>
        </div>
      )}"""

if broken_str in content:
    new_content = content.replace(broken_str, fixed_str)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("SUCCESS: Fixed DrawingRegisterView.jsx")
else:
    print("ERROR: broken_str not found in file")
