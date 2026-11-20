export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({
    status: 'ok',
    mode: 'standby',
    colab_gpu_url: null,
    models: [
      { id: 'segformer_b2_clothes', name: 'SegFormer-B2 Clothes (4-Class Visible)', task: 'segmentation' },
      { id: 'catvton', name: 'CatVTON (Inpainting)', task: 'vton' },
      { id: 'fashn_vton_1_5', name: 'FASHN VTON v1.5', task: 'vton' },
    ],
  })
}
