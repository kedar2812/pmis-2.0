import pandas as pd
import os

data = {
    'S.No': ['ITEM-001', 'ITEM-002', 'ITEM-003', 'ITEM-003', 'ITEM-004'],
    'Description': ['Excavation', 'Concrete Work', 'Steel Reinforcement', 'Steel Reinforcement (Duplicate)', 'Painting'],
    'UOM': ['Cum', 'Cum', 'Ton', 'Ton', 'Sqm'],
    'Quantity': [100.5, 50, 20.2, 5, 500],
    'Rate': [500, 4500, 65000, 65000, 150]
}

df = pd.DataFrame(data)
df.to_excel('test_boq_with_duplicates.xlsx', index=False)
print("Created file: test_boq_with_duplicates.xlsx")
